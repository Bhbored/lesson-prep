using System.ComponentModel.DataAnnotations;
using LessonPrep.Api.Application.Dtos;

namespace LessonPrep.Tests;

public sealed class ClientContractTests
{
    [Fact]
    public void RegenerationAllowsTheEmptyPreparedSourceEmittedForShortDocuments()
    {
        var parameter = typeof(PreparationSnapshot).GetConstructors().Single()
            .GetParameters().Single(parameter => parameter.Name == nameof(PreparationSnapshot.PreparedSourceText));
        var required = Assert.Single(parameter.GetCustomAttributes(typeof(RequiredAttribute), false).Cast<RequiredAttribute>());
        Assert.True(required.IsValid(""));
        Assert.False(required.IsValid(null));
    }
}
