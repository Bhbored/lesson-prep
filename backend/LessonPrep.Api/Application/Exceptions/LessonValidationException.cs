namespace LessonPrep.Api.Application.Exceptions;

public sealed class LessonValidationException(string message) : Exception(message);
