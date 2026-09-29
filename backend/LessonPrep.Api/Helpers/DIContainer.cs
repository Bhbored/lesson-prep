using System.Threading.RateLimiting;
using System.Net;
using Asp.Versioning;
using LessonPrep.Api.Application.Contracts.Ai;
using LessonPrep.Api.Application.Contracts.Documents;
using LessonPrep.Api.Application.Services.Lessons;
using LessonPrep.Api.Helpers.Documents;
using LessonPrep.Api.Infrastructure.Ai;
using LessonPrep.Api.Infrastructure.Ocr;
using LessonPrep.Api.Infrastructure.Security;
using Microsoft.AspNetCore.HttpLogging;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.OpenApi;

namespace LessonPrep.Api.Helpers;

public static class DIContainer
{
    public static IServiceCollection RegisterDependencies(this IServiceCollection services, IConfiguration configuration)
    {
        return services
            .RegisterForwardedHeaders(configuration)
            .RegisterCors(configuration)
            .RegisterApiVersioning()
            .RegisterRateLimiting(configuration)
            .RegisterControllers()
            .RegisterSwagger()
            .RegisterHttpLogging()
            .RegisterHttpClients()
            .RegisterServices();
    }

    public static IServiceCollection RegisterForwardedHeaders(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            options.ForwardLimit = 1;
            options.ForwardedForHeaderName = configuration["ReverseProxy:ClientIpHeader"] ?? "X-Forwarded-For";

            // Managed ingress can use changing addresses. Opt in only when all public
            // traffic reaches Kestrel through a proxy that overwrites these headers.
            if (configuration.GetValue<bool>("ReverseProxy:TrustAll"))
            {
                options.KnownProxies.Clear();
                options.KnownIPNetworks.Clear();
            }
            else
            {
                foreach (var proxy in configuration.GetSection("ReverseProxy:KnownProxies").Get<string[]>() ?? [])
                    options.KnownProxies.Add(IPAddress.Parse(proxy));
                foreach (var network in configuration.GetSection("ReverseProxy:KnownNetworks").Get<string[]>() ?? [])
                    options.KnownIPNetworks.Add(System.Net.IPNetwork.Parse(network));
            }
        });
        return services;
    }

    public static IServiceCollection RegisterCors(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddCors(options => options.AddDefaultPolicy(policy =>
            policy.WithOrigins(configuration.GetSection("Frontend:Origins").Get<string[]>() ?? ["http://localhost:5173"])
                .AllowAnyHeader()
                .AllowAnyMethod()));
        return services;
    }

    public static IServiceCollection RegisterApiVersioning(this IServiceCollection services)
    {
        var apiVersioningBuilder = services.AddApiVersioning(config =>
        {
            config.ApiVersionReader = new UrlSegmentApiVersionReader();
            config.DefaultApiVersion = new ApiVersion(1, 0);
            config.AssumeDefaultVersionWhenUnspecified = true;
        });
        apiVersioningBuilder.AddApiExplorer(options =>
        {
            options.GroupNameFormat = "'v'VVV";
            options.SubstituteApiVersionInUrl = true;
        });
        return services;
    }

    public static IServiceCollection RegisterRateLimiting(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = (context, _) =>
            {
                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                {
                    context.HttpContext.Response.Headers.RetryAfter =
                        Math.Max(1, (int)Math.Ceiling(retryAfter.TotalSeconds)).ToString();
                }
                return ValueTask.CompletedTask;
            };
            AddFixedWindowPolicy(options, configuration, "reads", "Reads", 120, TimeSpan.FromMinutes(1));
            AddFixedWindowPolicy(options, configuration, "models", "Models", 30, TimeSpan.FromMinutes(1));
            AddFixedWindowPolicy(options, configuration, "generation", "Generation", 10, TimeSpan.FromMinutes(1));
        });
        return services;
    }

    private static void AddFixedWindowPolicy(
        RateLimiterOptions options,
        IConfiguration configuration,
        string policyName,
        string configurationName,
        int defaultLimit,
        TimeSpan defaultWindow)
    {
        var permitLimit = configuration.GetValue<int?>($"RateLimits:{configurationName}:PermitLimit") ?? defaultLimit;
        var windowSeconds = configuration.GetValue<int?>($"RateLimits:{configurationName}:WindowSeconds")
            ?? (int)defaultWindow.TotalSeconds;
        options.AddPolicy(policyName, context =>
            RateLimitPartition.GetFixedWindowLimiter(
                GetRateLimitPartitionKey(context),
                _ => new FixedWindowRateLimiterOptions
                {
                    PermitLimit = Math.Max(1, permitLimit),
                    Window = TimeSpan.FromSeconds(Math.Max(1, windowSeconds)),
                    QueueLimit = 0,
                    AutoReplenishment = true
                }));
    }

    private static string GetRateLimitPartitionKey(HttpContext context)
    {
        var address = context.Connection.RemoteIpAddress;
        return address is null ? "ip:unknown" : $"ip:{address.MapToIPv6()}";
    }

    public static IServiceCollection RegisterControllers(this IServiceCollection services)
    {
        services.AddControllers()
            .AddJsonOptions(options => JsonDefaults.Configure(options.JsonSerializerOptions));
        return services;
    }

    public static IServiceCollection RegisterHttpLogging(this IServiceCollection services)
    {
        services.AddHttpLogging(options =>
        {
            options.LoggingFields = HttpLoggingFields.RequestPropertiesAndHeaders
                | HttpLoggingFields.ResponsePropertiesAndHeaders;
            options.RequestHeaders.Remove("X-Provider-Token");
        });
        return services;
    }

    public static IServiceCollection RegisterSwagger(this IServiceCollection services)
    {
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo { Title = "LessonPrep", Version = "1.0" });
        });
        return services;
    }

    public static IServiceCollection RegisterHttpClients(this IServiceCollection services)
    {
        services.AddHttpClient("ai", client => client.Timeout = TimeSpan.FromMinutes(5));
        return services;
    }

    public static IServiceCollection RegisterServices(this IServiceCollection services)
    {
        services.AddSingleton<CredentialTokenService>();
        services.AddSingleton<IOcrService, PaddleOcrEngine>();
        services.AddScoped<DocumentProcessor>();
        services.AddScoped<GenerationService>();
        services.AddScoped<IAiProvider, OpenAiProvider>();
        services.AddScoped<IAiProvider, GeminiProvider>();
        services.AddScoped<IAiProvider, AnthropicProvider>();
        services.AddScoped<IAiProvider, DeepSeekProvider>();
        return services;
    }
}
