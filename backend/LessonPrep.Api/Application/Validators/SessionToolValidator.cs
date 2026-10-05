using System.Text.Json;
using LessonPrep.Api.Application.Dtos;
using LessonPrep.Api.Application.Exceptions;
using LessonPrep.Api.Helpers;

namespace LessonPrep.Api.Application.Validators;

public static class SessionToolValidator
{
    private static readonly HashSet<string> ExerciseTypes = ["short", "multiple_choice", "true_false", "fill_blank"];

    public static object Parse(string tool, string json)
    {
        var text = ExtractJson(json);
        try
        {
            return tool == "game" ? ParseGame(text) : ParseExerciseSet(text);
        }
        catch (JsonException)
        {
            throw new LessonValidationException("The AI returned malformed activity data.");
        }
    }

    public static ExerciseSetDto ParseExerciseSet(string json)
    {
        var set = JsonSerializer.Deserialize<ExerciseSetDto>(json, JsonDefaults.Web)
                  ?? throw new LessonValidationException("The response was empty.");
        if (string.IsNullOrWhiteSpace(set.Title))
            throw new LessonValidationException("the activity title is missing");
        if (set.Items is not { Count: > 0 and <= 16 })
            throw new LessonValidationException("at least one exercise item is required");
        foreach (var item in set.Items)
        {
            if (item is null || string.IsNullOrWhiteSpace(item.Prompt) || string.IsNullOrWhiteSpace(item.Answer)
                || !ExerciseTypes.Contains(item.Type))
                throw new LessonValidationException("each exercise needs a prompt, type, and answer");
            if (item.Type is "multiple_choice" or "true_false")
            {
                var options = item.Options ?? [];
                if (options.Count < 2 || options.Any(string.IsNullOrWhiteSpace))
                    throw new LessonValidationException("choice items need at least two options");
            }
        }

        return set with
        {
            Title = set.Title.Trim(),
            Instructions = set.Instructions?.Trim() ?? "",
            Items = set.Items.Select(item => item with
            {
                Prompt = item.Prompt.Trim(),
                Answer = item.Answer.Trim(),
                Options = item.Options ?? [],
                Explanation = item.Explanation?.Trim() ?? ""
            }).ToList()
        };
    }

    public static GameDto ParseGame(string json)
    {
        var game = JsonSerializer.Deserialize<GameDto>(json, JsonDefaults.Web)
                   ?? throw new LessonValidationException("The response was empty.");
        if (string.IsNullOrWhiteSpace(game.Title) || game.Kind is not ("quiz" or "matching"))
            throw new LessonValidationException("the game title or kind is missing");
        if (game.Kind == "quiz")
        {
            var questions = game.Quiz?.Questions ?? [];
            if (questions.Count is < 1 or > 16)
                throw new LessonValidationException("the quiz needs questions");
            foreach (var question in questions)
            {
                if (question is null || string.IsNullOrWhiteSpace(question.Prompt)
                    || question.Options is not { Count: >= 2 and <= 8 }
                    || question.Options.Any(string.IsNullOrWhiteSpace)
                    || question.CorrectIndex < 0 || question.CorrectIndex >= question.Options.Count)
                    throw new LessonValidationException("each quiz question needs options and a correct answer");
            }
        }
        else
        {
            var pairs = game.Matching?.Pairs ?? [];
            if (pairs.Count is < 2 or > 16)
                throw new LessonValidationException("the matching game needs pairs");
            if (pairs.Any(pair => pair is null || string.IsNullOrWhiteSpace(pair.Left)
                                  || string.IsNullOrWhiteSpace(pair.Right)))
                throw new LessonValidationException("each matching pair needs both sides");
        }

        return game with
        {
            Title = game.Title.Trim(),
            Quiz = new GameQuizDto((game.Quiz?.Questions ?? []).Select(question => question with
            {
                Prompt = question.Prompt.Trim(),
                Options = question.Options.Select(option => option.Trim()).ToList(),
                Explanation = question.Explanation?.Trim() ?? ""
            }).ToList()),
            Matching = new GameMatchingDto((game.Matching?.Pairs ?? []).Select(pair =>
                pair with { Left = pair.Left.Trim(), Right = pair.Right.Trim() }).ToList())
        };
    }

    private static string ExtractJson(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
            throw new LessonValidationException("The response was empty.");
        var start = text.IndexOf('{');
        var end = text.LastIndexOf('}');
        if (start < 0 || end <= start)
            throw new LessonValidationException("The AI returned malformed activity data.");
        return text[start..(end + 1)];
    }
}
