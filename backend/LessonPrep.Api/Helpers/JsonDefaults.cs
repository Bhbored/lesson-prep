using System.Text.Json;
using System.Text.Json.Serialization;

namespace LessonPrep.Api.Helpers;

public static class JsonDefaults
{
    public static JsonSerializerOptions Web { get; } = Create();

    public static void Configure(JsonSerializerOptions options)
    {
        options.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.Converters.Add(new JsonStringEnumConverter());
    }

    private static JsonSerializerOptions Create()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        Configure(options);
        return options;
    }
}
