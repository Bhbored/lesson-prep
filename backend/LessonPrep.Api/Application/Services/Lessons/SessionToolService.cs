using LessonPrep.Api.Application.Contracts.Ai;
using LessonPrep.Api.Application.Dtos;
using LessonPrep.Api.Application.Enums;
using LessonPrep.Api.Application.Exceptions;
using LessonPrep.Api.Application.Validators;
using LessonPrep.Api.Helpers.Prompts;
using LessonPrep.Api.Helpers.Schemas;
using LessonPrep.Api.Infrastructure.Security;

namespace LessonPrep.Api.Application.Services.Lessons;

public sealed class SessionToolService(
    CredentialTokenService tokens,
    IEnumerable<IAiProvider> providers)
{
    private readonly IReadOnlyDictionary<AiProvider, IAiProvider> _providers = providers.ToDictionary(x => x.Provider);

    public async Task<object> CreateAsync(SessionToolRequest request, CancellationToken cancellationToken)
    {
        if (request.Tool is not ("worksheet" or "quiz" or "game"))
            throw new LessonValidationException("Unknown session tool.");
        GenerationService.ValidateSnapshot(request.Snapshot, 1, 1);
        if (request.Session is null
            || string.IsNullOrWhiteSpace(request.Session.Title)
            || string.IsNullOrWhiteSpace(request.Session.Topic)
            || request.Session.LearningObjectives is not { Count: > 0 }
            || request.Session.Phases is not { Count: > 0 })
            throw new LessonValidationException("The session lesson is invalid.");
        if (!_providers.TryGetValue(request.Provider, out var provider))
            throw new LessonValidationException("Unknown AI provider.");
        if (string.IsNullOrWhiteSpace(request.Model) || request.Model.Length > 150)
            throw new LessonValidationException("Choose an AI model.");
        var apiKey = tokens.Open(request.CredentialToken, request.Provider);
        var models = await provider.ListModelsAsync(apiKey, cancellationToken);
        if (!models.Any(model => model.Id == request.Model))
            throw new LessonValidationException("The selected model is no longer available. Refresh your model list.");
        var schema = request.Tool == "game" ? SessionToolSchemas.Game : SessionToolSchemas.ExerciseSet;
        var source = SourceText(request.Snapshot);
        var user = SessionToolPrompt.User(request.Tool, request.Session, source, request.Snapshot.MaterialNote,
            request.Snapshot.SourceLanguage);
        string? feedback = null;
        for (var attempt = 0; attempt < 2; attempt++)
        {
            var prompt = feedback is null
                ? user
                : $"{user}\nCORRECTION REQUIRED: The previous response failed validation: {feedback}. Return complete corrected JSON.";
            try
            {
                var json = await provider.GenerateJsonAsync(apiKey, request.Model, SessionToolPrompt.System, prompt,
                    schema, 2500, cancellationToken);
                return SessionToolValidator.Parse(request.Tool, json);
            }
            catch (LessonValidationException exception) when (attempt == 0)
            {
                feedback = exception.Message;
            }
        }

        throw new LessonValidationException("The AI returned invalid activity data.");
    }

    private static string SourceText(PreparationSnapshot snapshot)
    {
        var text = string.IsNullOrWhiteSpace(snapshot.PreparedSourceText)
            ? snapshot.SourceText
            : snapshot.PreparedSourceText;
        return text.Length <= 20_000 ? text : text[..20_000];
    }
}
