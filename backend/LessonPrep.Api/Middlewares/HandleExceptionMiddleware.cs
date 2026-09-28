using System.Text.Json;
using LessonPrep.Api.Application.Dtos;
using LessonPrep.Api.Application.Exceptions;
using LessonPrep.Api.Application.Services.Lessons;

namespace LessonPrep.Api.Middlewares;

public sealed class HandleExceptionMiddleware(RequestDelegate next, ILogger<HandleExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
        }
        catch (Exception exception)
        {
            var (status, code, message) = exception switch
            {
                LessonValidationException => (400, "validation_error", exception.Message),
                DocumentException => (400, "document_error", exception.Message),
                CredentialException => (400, "credential_error", exception.Message),
                ProviderException provider => (provider.Status is 401 or 403 ? 401 : 502, "provider_error", provider.Message),
                JsonException => (400, "invalid_json", "Invalid request data."),
                _ => (500, "server_error", "The request could not be completed.")
            };
            if (status == 500)
                logger.LogError(exception, "Unhandled request failure");
            if (context.Response.HasStarted)
            {
                try { await Sse.WriteAsync(context.Response, "error", new ApiError(code, message), CancellationToken.None); }
                catch (IOException) { }
            }
            else
            {
                context.Response.StatusCode = status;
                await context.Response.WriteAsJsonAsync(new ApiError(code, message));
            }
        }
    }
}
