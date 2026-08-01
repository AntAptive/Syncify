using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Windows.Media.Control;
using Windows.Storage.Streams;

class NowPlaying
{
    static async Task Main()
    {
        var mgr = await GlobalSystemMediaTransportControlsSessionManager.RequestAsync();
        var session = mgr.GetCurrentSession();

        NowPlayingResult result;

        if (session == null)
        {
            result = NothingPlaying();
        }
        else
        {
            var props = await session.TryGetMediaPropertiesAsync();
            var playback = session.GetPlaybackInfo();

            var (playing, stopped) = MapStatus(playback.PlaybackStatus);
            var coverArtUrl = await GetThumbnailDataUri(props);

            result = new NowPlayingResult
            {
                Playing = playing,
                Stopped = stopped,
                Song = props.Title ?? "",
                Artists = new[] { new ArtistInfo { Name = props.Artist ?? "" } },
                FirstArtist = props.Artist ?? "",
                CoverArtUrl = coverArtUrl ?? ""
            };
        }

        Console.WriteLine(JsonSerializer.Serialize(result, NowPlayingJsonContext.Default.NowPlayingResult));
    }

    static (bool playing, bool stopped) MapStatus(GlobalSystemMediaTransportControlsSessionPlaybackStatus status)
    {
        switch (status)
        {
            case GlobalSystemMediaTransportControlsSessionPlaybackStatus.Playing:
                return (true, false);
            case GlobalSystemMediaTransportControlsSessionPlaybackStatus.Paused:
                return (false, false);
            default: // Stopped, Closed, Changing
                return (false, true);
        }
    }

    static async Task<string> GetThumbnailDataUri(GlobalSystemMediaTransportControlsSessionMediaProperties props)
    {
        if (props?.Thumbnail == null) return null;

        using var stream = await props.Thumbnail.OpenReadAsync();
        using var reader = new DataReader(stream);
        await reader.LoadAsync((uint)stream.Size);

        var bytes = new byte[stream.Size];
        reader.ReadBytes(bytes);

        string mime = DetectMimeType(bytes);
        return $"data:{mime};base64,{Convert.ToBase64String(bytes)}";
    }

    static string DetectMimeType(byte[] bytes)
    {
        if (bytes.Length >= 8 && bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47)
            return "image/png";
        if (bytes.Length >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF)
            return "image/jpeg";
        return "image/png";
    }

    static NowPlayingResult NothingPlaying() => new NowPlayingResult
    {
        Playing = false,
        Stopped = true,
        Song = "",
        Artists = new[] { new ArtistInfo { Name = "" } },
        FirstArtist = "",
        CoverArtUrl = ""
    };
}

class ArtistInfo
{
    public string Name { get; set; } = "";
}

class NowPlayingResult
{
    public bool Playing { get; set; }
    public bool Stopped { get; set; }
    public string Song { get; set; } = "";
    public ArtistInfo[] Artists { get; set; } = Array.Empty<ArtistInfo>();
    public string FirstArtist { get; set; } = "";
    public string CoverArtUrl { get; set; } = "";
}

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(NowPlayingResult))]
partial class NowPlayingJsonContext : JsonSerializerContext
{
}