using System.Net;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace LessonPrep.Tests;

public sealed class ReverseProxyTests
{
    private static WebApplicationFactory<Program> Create(params (string Key, string Value)[] settings) =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Production");
            builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(
                new Dictionary<string, string?>
                {
                    ["Crypto:TokenSecret"] = Convert.ToBase64String(new byte[32]),
                    ["RateLimits:Reads:PermitLimit"] = "1"
                }.Concat(settings.Select(setting => new KeyValuePair<string, string?>(setting.Key, setting.Value)))));
        });

    private static Task<HttpContext> Send(WebApplicationFactory<Program> app, string path = "/lessonprep/v1.0/LessonFlowPresets",
        string remote = "203.0.113.10", string? client = null, string header = "X-Forwarded-For", string? scheme = "https") =>
        app.Server.SendAsync(context =>
        {
            context.Connection.RemoteIpAddress = IPAddress.Parse(remote);
            context.Request.Method = "GET";
            context.Request.Scheme = "http";
            context.Request.Host = new HostString("api.example.com");
            context.Request.Path = path;
            if (scheme is not null) context.Request.Headers["X-Forwarded-Proto"] = scheme;
            if (client is not null) context.Request.Headers[header] = client;
        });

    [Fact]
    public async Task UnknownProxyCannotSpoofHttps()
    {
        await using var app = Create();
        var response = await Send(app);
        Assert.Equal(307, response.Response.StatusCode);
        Assert.Equal("https://api.example.com/lessonprep/v1.0/LessonFlowPresets", response.Response.Headers.Location);
    }

    [Theory]
    [InlineData("ReverseProxy:KnownProxies:0", "203.0.113.10")]
    [InlineData("ReverseProxy:KnownNetworks:0", "203.0.113.0/24")]
    [InlineData("ReverseProxy:TrustAll", "true")]
    public async Task TrustedIngressRestoresHttpsBeforeRedirectionAndHsts(string key, string value)
    {
        await using var app = Create((key, value));
        var response = await Send(app, client: "198.51.100.1");
        Assert.Equal(200, response.Response.StatusCode);
        Assert.Contains("max-age=31536000", response.Response.Headers.StrictTransportSecurity.ToString());
        Assert.Equal("https", response.Request.Scheme);
        Assert.Equal(IPAddress.Parse("198.51.100.1"), response.Connection.RemoteIpAddress);
    }

    [Theory]
    [InlineData("X-Forwarded-For")]
    [InlineData("X-Real-IP")]
    [InlineData("CF-Connecting-IP")]
    public async Task RateLimitsUseForwardedClientAddresses(string header)
    {
        await using var app = Create(("ReverseProxy:TrustAll", "true"), ("ReverseProxy:ClientIpHeader", header));
        Assert.Equal(200, (await Send(app, client: "198.51.100.1", header: header)).Response.StatusCode);
        Assert.Equal(429, (await Send(app, client: "198.51.100.1", header: header)).Response.StatusCode);
        Assert.Equal(200, (await Send(app, client: "198.51.100.2", header: header)).Response.StatusCode);
    }

    [Fact]
    public async Task OnlyOneProxyHopIsConsumed()
    {
        await using var app = Create(("ReverseProxy:TrustAll", "true"));
        var response = await Send(app, client: "192.0.2.123, 198.51.100.1");
        Assert.Equal(IPAddress.Parse("198.51.100.1"), response.Connection.RemoteIpAddress);
    }

    [Theory]
    [InlineData("/health")]
    [InlineData("/health/live")]
    public async Task InternalHttpHealthProbesDoNotRedirect(string path)
    {
        await using var app = Create();
        Assert.Equal(200, (await Send(app, path, scheme: null)).Response.StatusCode);
    }
}
