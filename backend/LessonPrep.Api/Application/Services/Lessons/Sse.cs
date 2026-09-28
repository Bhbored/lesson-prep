using System.Text.Json;
using System.Text.Json.Serialization;

namespace LessonPrep.Api.Application.Services.Lessons;

public static class Sse
{
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };
    public static async Task WriteAsync(HttpResponse response, string eventName, object value, CancellationToken ct)
    {
        if (!response.HasStarted)
        {
            response.ContentType = "text/event-stream";
            response.Headers.CacheControl = "no-cache";
            response.Headers["X-Accel-Buffering"] = "no";
        }
        await response.WriteAsync($"event: {eventName}\ndata: {JsonSerializer.Serialize(value, Options)}\n\n", ct);
        await response.Body.FlushAsync(ct);
    }
}
