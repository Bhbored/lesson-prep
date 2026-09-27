using System.Text;

namespace LessonPrep.Api.Application.Services;

// Converts streaming JSON string values into readable provisional text.
// The complete JSON is still parsed and validated before a variant becomes final.
public sealed class ProvisionalTextExtractor
{
    private readonly Stack<(char Kind, bool ExpectKey)> _containers = new();
    private readonly StringBuilder _fragment = new();
    private bool _insideString;
    private bool _stringIsKey;
    private bool _escape;
    private int _unicodeDigits;
    private int _unicodeValue;

    public string Push(string chunk)
    {
        _fragment.Clear();
        foreach (var character in chunk)
        {
            if (_insideString)
            {
                if (_unicodeDigits > 0)
                {
                    var digit = character switch
                    {
                        >= '0' and <= '9' => character - '0',
                        >= 'a' and <= 'f' => character - 'a' + 10,
                        >= 'A' and <= 'F' => character - 'A' + 10,
                        _ => -1
                    };
                    if (digit >= 0)
                    {
                        _unicodeValue = (_unicodeValue << 4) | digit;
                        _unicodeDigits--;
                        if (_unicodeDigits == 0 && !_stringIsKey && !char.IsSurrogate((char)_unicodeValue))
                            _fragment.Append((char)_unicodeValue);
                    }
                    else _unicodeDigits = 0;
                    continue;
                }
                if (_escape)
                {
                    _escape = false;
                    if (character == 'u') { _unicodeDigits = 4; _unicodeValue = 0; continue; }
                    if (!_stringIsKey) _fragment.Append(character switch { 'n' or 'r' or 't' => ' ', _ => character });
                    continue;
                }
                if (character == '\\') { _escape = true; continue; }
                if (character == '"')
                {
                    _insideString = false;
                    if (_stringIsKey)
                    {
                        if (_containers.Count > 0)
                        {
                            var top = _containers.Pop();
                            _containers.Push((top.Kind, false));
                        }
                    }
                    else _fragment.Append('\n');
                    continue;
                }
                if (!_stringIsKey) _fragment.Append(character);
                continue;
            }

            switch (character)
            {
                case '{': _containers.Push(('{', true)); break;
                case '[': _containers.Push(('[', false)); break;
                case '}':
                case ']': if (_containers.Count > 0) _containers.Pop(); break;
                case ',':
                    if (_containers.Count > 0 && _containers.Peek().Kind == '{')
                    {
                        _containers.Pop(); _containers.Push(('{', true));
                    }
                    break;
                case '"':
                    _insideString = true;
                    _stringIsKey = _containers.Count > 0 && _containers.Peek() is ('{', true);
                    break;
            }
        }
        return _fragment.ToString();
    }
}
