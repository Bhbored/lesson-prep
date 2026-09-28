using System.Text.Json;
using LessonPrep.Api.Helpers;

namespace LessonPrep.Api.Application.Services.Lessons;

public static class Sse
{
    public static async Task WriteAsync(HttpResponse response, string eventName, object value, CancellationToken ct)
    {
        if (!response.HasStarted)
        {
            response.ContentType = "text/event-stream";
            response.Headers.CacheControl = "no-cache";
            response.Headers["X-Accel-Buffering"] = "no";
        }
        await response.WriteAsync($"event: {eventName}\ndata: {JsonSerializer.Serialize(value, JsonDefaults.Web)}\n\n", ct);
        await response.Body.FlushAsync(ct);
    }
}
