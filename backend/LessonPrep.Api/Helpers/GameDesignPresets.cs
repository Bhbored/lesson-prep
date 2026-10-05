using System.Globalization;
using System.Text.RegularExpressions;

namespace LessonPrep.Api.Helpers;

public sealed record GameDesignPreset(
    string Id,
    string Band,
    string Name,
    string Kind,
    string World,
    string Tone,
    string Host,
    string Play);

public static class GameDesignPresets
{
    public static readonly GameDesignPreset StoryGarden = new(
        "story_garden",
        "early",
        "Story Garden",
        "adventure",
        "A sunny garden path with paper flowers, puddles, and a friendly guide who walks beside the class.",
        "Warm, spoken-aloud, short sentences, lots of cheer. No exam wording.",
        "A kind garden guide",
        "One glowing choice at a time. Celebrate every try. Keep the story moving.");

    public static readonly GameDesignPreset QuestAtlas = new(
        "quest_atlas",
        "middle",
        "Quest Atlas",
        "matching",
        "A folded field map with ink stamps, secret trails, and a compass that clicks when a clue locks.",
        "Adventurous and witty, never sarcastic or babyish.",
        "A navigator",
        "Match clues to places. Cards should feel like stamps on a map, not a test.");

    public static readonly GameDesignPreset SignalLab = new(
        "signal_lab",
        "upper",
        "Signal Lab",
        "race",
        "A night studio with amber lamps, glass instruments, and a quiet countdown.",
        "Crisp, clever, respectful of older students. No cartoon voices.",
        "A lab lead",
        "Short challenge rounds with clean feedback. Make it feel like a briefing, not a worksheet.");

    public static GameDesignPreset ForClass(string? className)
    {
        return BandFor(className) switch
        {
            "early" => StoryGarden,
            "upper" => SignalLab,
            _ => QuestAtlas
        };
    }

    public static string BandFor(string? className)
    {
        var text = className?.Trim().ToLowerInvariant() ?? "";
        if (text.Length == 0) return "middle";
        if (Regex.IsMatch(text,
                @"\b(k|kg|pre-?k|kindergar|reception|cp|ce1|ce2|cm1|year\s*[1-3]|grade\s*[1-4]|gs|ms)\b"))
            return "early";
        if (Regex.IsMatch(text,
                @"\b(grade\s*(9|10|11|12)|year\s*(9|10|11|12|13)|lyc[eé]|seconde|terminale|premiere|high|senior|a-?level)\b"))
            return "upper";
        if (Regex.IsMatch(text,
                @"\b(grade\s*[5-8]|year\s*[4-8]|cm2|6e|5e|4e|3e|coll[eè]ge|middle|junior)\b"))
            return "middle";
        var number = Regex.Match(text, @"\d{1,2}");
        if (number.Success && int.TryParse(number.Value, NumberStyles.None, CultureInfo.InvariantCulture, out var grade))
            return grade switch
            {
                <= 4 => "early",
                <= 8 => "middle",
                _ => "upper"
            };
        return "middle";
    }
}
