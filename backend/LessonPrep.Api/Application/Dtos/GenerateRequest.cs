using LessonPrep.Api.Application.Enums;
using Microsoft.AspNetCore.Http;

namespace LessonPrep.Api.Application.Dtos;

public sealed record GenerateRequest(
    string ClassName,
    int DurationMinutes,
    int VariantCount,
    string SourceLanguage,
    IReadOnlyList<PhaseSpec> Phases,
    AiProvider Provider,
    string Model,
    string CredentialToken,
    IReadOnlyList<IFormFile> Files);
