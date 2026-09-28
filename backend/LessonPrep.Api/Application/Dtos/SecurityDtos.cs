using System.ComponentModel.DataAnnotations;
using LessonPrep.Api.Application.Enums;

namespace LessonPrep.Api.Application.Dtos;

public sealed record IssueCredentialRequest(
    [Required, EnumDataType(typeof(AiProvider))] AiProvider Provider,
    [Required, StringLength(4096, MinimumLength = 1)] string ApiKey);

public sealed record CredentialTokenDto(string Token);
