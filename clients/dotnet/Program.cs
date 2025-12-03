using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace CashRegister;

class Program
{
    static readonly string DefaultApiUrl = "http://localhost:3000";

    static async Task<int> Main(string[] args)
    {
        if (args.Length == 0 || args.Contains("--help") || args.Contains("-h"))
        {
            ShowHelp();
            return 0;
        }

        var inputFile = args[0];
        var options = ParseOptions(args);

        if (!File.Exists(inputFile))
        {
            Console.Error.WriteLine($"Error: Input file not found: {inputFile}");
            return 1;
        }

        var apiUrl = options.ApiUrl ?? Environment.GetEnvironmentVariable("CASH_REGISTER_API") ?? DefaultApiUrl;

        // Check API availability
        if (!await CheckApi(apiUrl))
        {
            Console.Error.WriteLine($"Error: API server not available at {apiUrl}. Start it with: cd api && npm start");
            return 1;
        }

        try
        {
            var result = await ProcessFile(apiUrl, inputFile, options);
            WriteOutput(inputFile, result, options.OutputPath);
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error: {ex.Message}");
            return 1;
        }
    }

    static void ShowHelp()
    {
        Console.WriteLine(@"
Cash Register - .NET Client

Process transaction files and calculate change.

Usage: dotnet run -- <input-file> [options]

Arguments:
  input-file              Path to input file with transactions

Options:
  --no-pennies            Disable pennies (Swedish rounding)
  --half-dollars          Enable half dollars
  --divisor <n>           Set random divisor (default: 3)
  -o, --output <path>     Custom output file path
  --api <url>             API server URL (default: http://localhost:3000)
  -h, --help              Show this help message

Examples:
  dotnet run -- ../../data/sample-usd.txt
  dotnet run -- ../../data/sample-usd.txt --no-pennies
  dotnet run -- ../../data/sample-usd.txt --divisor 5
");
    }

    static Options ParseOptions(string[] args)
    {
        var options = new Options();

        for (int i = 1; i < args.Length; i++)
        {
            switch (args[i])
            {
                case "--no-pennies":
                    options.NoPennies = true;
                    break;
                case "--half-dollars":
                    options.HalfDollars = true;
                    break;
                case "--divisor":
                    if (i + 1 < args.Length && int.TryParse(args[++i], out var divisor))
                        options.Divisor = divisor;
                    break;
                case "-o":
                case "--output":
                    if (i + 1 < args.Length)
                        options.OutputPath = args[++i];
                    break;
                case "--api":
                    if (i + 1 < args.Length)
                        options.ApiUrl = args[++i];
                    break;
            }
        }

        return options;
    }

    static async Task<bool> CheckApi(string apiUrl)
    {
        using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(5) };
        try
        {
            var response = await client.GetAsync($"{apiUrl}/health");
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    static async Task<ApiResponse> ProcessFile(string apiUrl, string inputFile, Options options)
    {
        var content = await File.ReadAllTextAsync(inputFile);

        var queryParams = new List<string>();
        if (options.Divisor.HasValue)
            queryParams.Add($"divisor={options.Divisor}");
        if (options.NoPennies)
            queryParams.Add("noPennies=true");
        if (options.HalfDollars)
            queryParams.Add("halfDollars=true");

        var url = $"{apiUrl}/process";
        if (queryParams.Count > 0)
            url += "?" + string.Join("&", queryParams);

        using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
        var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(content, Encoding.UTF8, "text/plain")
        };

        var response = await client.SendAsync(request);
        var json = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            var error = JsonSerializer.Deserialize<ErrorResponse>(json);
            throw new Exception($"API error: {error?.Error ?? "Unknown error"}");
        }

        return JsonSerializer.Deserialize<ApiResponse>(json)
            ?? throw new Exception("Failed to parse API response");
    }

    static void WriteOutput(string inputFile, ApiResponse result, string? customOutputPath)
    {
        // Determine output path
        string outputPath;
        if (!string.IsNullOrEmpty(customOutputPath))
        {
            outputPath = customOutputPath;
        }
        else
        {
            var scriptDir = AppContext.BaseDirectory;
            var outputDir = Path.Combine(scriptDir, "..", "..", "..", "..", "..", "output", "clients", "dotnet");
            Directory.CreateDirectory(outputDir);

            var inputBasename = Path.GetFileNameWithoutExtension(inputFile);
            outputPath = Path.Combine(outputDir, $"{inputBasename}-output.txt");
        }

        // Ensure output directory exists
        var dir = Path.GetDirectoryName(outputPath);
        if (!string.IsNullOrEmpty(dir))
            Directory.CreateDirectory(dir);

        // Build output content
        var lines = new List<string>();
        if (result.HasRandomization)
            lines.Add($"* randomization used - divisible by {result.Divisor}");
        else
            lines.Add($"* no entries divisible by {result.Divisor}");

        lines.AddRange(result.Results);

        File.WriteAllLines(outputPath, lines);

        // Print summary
        Console.WriteLine($"Processed {result.Results.Length} transactions ({result.Currency})");
        Console.WriteLine($"Output: {outputPath}");
        Console.WriteLine();
        Console.WriteLine("--- Results ---");

        if (result.HasRandomization)
            Console.WriteLine($"* randomization used - divisible by {result.Divisor}");
        else
            Console.WriteLine($"* no entries divisible by {result.Divisor}");

        foreach (var line in result.Results)
            Console.WriteLine(line);
    }
}

class Options
{
    public int? Divisor { get; set; }
    public bool NoPennies { get; set; }
    public bool HalfDollars { get; set; }
    public string? OutputPath { get; set; }
    public string? ApiUrl { get; set; }
}

class ApiResponse
{
    [JsonPropertyName("currency")]
    public string Currency { get; set; } = "";

    [JsonPropertyName("hasRandomization")]
    public bool HasRandomization { get; set; }

    [JsonPropertyName("divisor")]
    public int Divisor { get; set; }

    [JsonPropertyName("results")]
    public string[] Results { get; set; } = Array.Empty<string>();
}

class ErrorResponse
{
    [JsonPropertyName("error")]
    public string? Error { get; set; }
}
