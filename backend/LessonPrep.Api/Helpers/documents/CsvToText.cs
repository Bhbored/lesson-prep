using System.Globalization;
using System.Text;
using CsvHelper;
using CsvHelper.Configuration;
using LessonPrep.Api.Application.Exceptions;

namespace LessonPrep.Api.Helpers.Documents;

public static class CsvToText
{
    public static string Convert(string text)
    {
        using var reader = new StringReader(text);
        using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            BadDataFound = _ => throw new DocumentException("The CSV file is malformed."),
            MissingFieldFound = null
        });
        if (!csv.Read()) return "";
        csv.ReadHeader();
        var headers = csv.HeaderRecord ?? [];
        var output = new StringBuilder();
        while (csv.Read())
        {
            for (var i = 0; i < headers.Length; i++)
            {
                var value = csv.GetField(i)?.Trim();
                if (!string.IsNullOrWhiteSpace(value)) output.Append(headers[i]).Append(": ").AppendLine(value);
            }

            output.AppendLine();
        }

        return output.ToString();
    }
}
