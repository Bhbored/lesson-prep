using LessonPrep.Api.Helpers;
using LessonPrep.Api.Infrastructure.Security;
using LessonPrep.Api.Middlewares;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, services, loggerConfiguration) =>
{
    loggerConfiguration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services);
});

builder.Services.RegisterDependencies(builder.Configuration);
builder.Services.AddHttpsRedirection(options =>
{
    if (!builder.Environment.IsDevelopment()) options.HttpsPort = 443;
});

builder.Services.AddHsts(options =>
{
    options.MaxAge = TimeSpan.FromDays(365);
    options.IncludeSubDomains = true;
    options.Preload = true;
});

var app = builder.Build();

app.UseForwardedHeaders();
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<HandleExceptionMiddleware>();
app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}
else
{
    app.UseHsts();
}

app.UseWhen(context => context.Request.Path != "/health" && context.Request.Path != "/health/live",
    branch => branch.UseHttpsRedirection());
app.UseCors();
app.UseRateLimiter();
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "1.0");
});
app.UseHttpLogging();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapGet("/health/live", () => Results.Ok(new { status = "ok" }));

_ = app.Services.GetRequiredService<CredentialTokenService>();
app.Run();

public partial class Program;
