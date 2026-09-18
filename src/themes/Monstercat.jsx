import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import styled, { keyframes } from "styled-components";

const TYPE_SPEED_MS = 21;

const blink = keyframes`
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
`;

const WIDGET_PADDING = "2.7rem";
const ART_SIZE = `calc(100vh - ${WIDGET_PADDING} * 2)`;
// Available horizontal space left for the text/progress column once the
// cover art, its gap, and the container padding are accounted for.
const SONG_INFO_MAX_WIDTH = `max(0px, calc(100vw - ${WIDGET_PADDING} * 2 - ${ART_SIZE} * 1.23))`;

const WidgetContainer = styled.div`
  display: flex;
  align-items: center;
  gap: calc(${ART_SIZE} * 0.23);
  padding: ${WIDGET_PADDING};
  width: fit-content;
  height: ${ART_SIZE};
  background: transparent;
  color: #ffffff;
  font-family: "Montserrat", "Helvetica Neue", Arial, sans-serif;
  font-weight: normal;
  position: fixed;
  bottom: 0;
  left: 0;
  margin: 0;
`;

const CoverArtWrap = styled.div`
  position: relative;
  flex-shrink: 0;
  width: ${ART_SIZE};
  height: ${ART_SIZE};
  overflow: hidden;
  background: #111;
  filter: drop-shadow(0 calc(${ART_SIZE} * 0.02) calc(${ART_SIZE} * 0.04) rgba(0, 0, 0, 0.45));
`;

const CoverArt = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: opacity 0.25s ease;
`;

const SongInfo = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: calc(${ART_SIZE} * 0.02);
  width: min(calc(${ART_SIZE} * 6), ${SONG_INFO_MAX_WIDTH});
  flex: 0 0 min(calc(${ART_SIZE} * 6), ${SONG_INFO_MAX_WIDTH});
  overflow: visible;
`;

const ArtistText = styled.div`
  display: flex;
  align-items: center;
  font-family: "Montserrat", "Helvetica Neue", Arial, sans-serif;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: -0.11em;
  font-size: calc(${ART_SIZE} * 0.42);
  line-height: 1.1;
  height: 1.1em;
  transition: height 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  white-space: nowrap;
  text-align: left;
  color: #ffffff;
  text-shadow: 0 calc(${ART_SIZE} * 0.02) calc(${ART_SIZE} * 0.04) rgba(0, 0, 0, 0.45);
`;

const SongText = styled.div`
  display: flex;
  align-items: center;
  font-family: "Montserrat", "Helvetica Neue", Arial, sans-serif;
  font-weight: normal;
  text-transform: uppercase;
  letter-spacing: -0.11em;
  font-size: calc(${ART_SIZE} * 0.27);
  line-height: 1.2;
  height: 1.2em;
  transition: height 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  white-space: nowrap;
  text-align: left;
  color: #ffffff;
  text-shadow: 0 calc(${ART_SIZE} * 0.02) calc(${ART_SIZE} * 0.04) rgba(0, 0, 0, 0.4);
`;

const ProgressRow = styled.div`
  display: flex;
  align-items: center;
  gap: calc(${ART_SIZE} * 0.06);
  margin-top: calc(${ART_SIZE} * 0.06);
`;

const ProgressTrack = styled.div`
  flex: 1 1 auto;
  height: calc(${ART_SIZE} * 0.025);
  background: rgba(255, 255, 255, 0.25);
  border-radius: calc(${ART_SIZE} * 0.0125);
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  width: ${(props) => props.$percent}%;
  background: #ffffff;
  border-radius: calc(${ART_SIZE} * 0.0125);
  transition: width 0.35s cubic-bezier(0.22, 1, 0.36, 1);
`;

const TimeText = styled.div`
  flex-shrink: 0;
  font-family: "Gotham", "Montserrat", "Helvetica Neue", Arial, sans-serif;
  font-weight: normal;
  font-size: calc(${ART_SIZE} * 0.15);
  letter-spacing: -0.05em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  text-align: left;
  color: #ffffff;
  text-shadow: 0 calc(${ART_SIZE} * 0.008) calc(${ART_SIZE} * 0.02) rgba(0, 0, 0, 0.6);
`;

const Measurer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
`;

const Caret = styled.span`
  display: inline-block;
  width: calc(${ART_SIZE} * 0.025);
  margin-left: calc(${ART_SIZE} * 0.025);
  background: currentColor;
  animation: ${blink} 1s step-end infinite;
`;

const TypewriterText = ({
  text = "",
  speed = TYPE_SPEED_MS,
  as: Component = "div",
  showCaret = false,
  fitFontSize,
  style,
  ...rest
}) => {
  const [displayed, setDisplayed] = useState(text);
  const [fontSize, setFontSize] = useState(() => fitFontSize?.(text));
  const prevTextRef = useRef(text);
  const timeoutRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (fontSize === undefined && fitFontSize) {
      const fs = fitFontSize(text);
      if (fs !== undefined) setFontSize(fs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (text === prevTextRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const newText = text;
    prevTextRef.current = text;
    setIsAnimating(true);

    let current = displayed;

    const deleteStep = () => {
      if (current.length > 0) {
        current = current.slice(0, -1);
        setDisplayed(current);
        timeoutRef.current = setTimeout(deleteStep, speed);
      } else {
        if (fitFontSize) setFontSize(fitFontSize(newText));
        typeStep(0);
      }
    };

    const typeStep = (i) => {
      if (i <= newText.length) {
        current = newText.slice(0, i);
        setDisplayed(current);
        if (i < newText.length) {
          timeoutRef.current = setTimeout(() => typeStep(i + 1), speed);
        } else {
          setIsAnimating(false);
        }
      }
    };

    deleteStep();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed]);

  return (
    <Component
      style={fontSize !== undefined ? { ...style, fontSize: `${fontSize}px` } : style}
      {...rest}
    >
      {displayed}
      {showCaret && isAnimating && <Caret />}
    </Component>
  );
};

const formatTime = (ms) => {
  if (!ms || ms < 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const findWidestDigit = (measurerEl) => {
  let widestDigit = "0";
  let widestWidth = -1;
  for (let d = 0; d <= 9; d++) {
    measurerEl.textContent = String(d);
    const width = measurerEl.getBoundingClientRect().width;
    if (width > widestWidth) {
      widestWidth = width;
      widestDigit = String(d);
    }
  }
  return widestDigit;
};

const measureTimeTextWidth = (measurerEl, durationMs) => {
  if (!measurerEl) return undefined;
  const widestDigit = findWidestDigit(measurerEl);
  const totalSeconds = Math.floor(Math.max(0, durationMs || 0) / 1000);
  const minuteDigits = Math.max(1, String(Math.floor(totalSeconds / 60)).length);
  const widest = `${widestDigit.repeat(minuteDigits)}:${widestDigit}${widestDigit}`;
  measurerEl.textContent = `${widest} / ${widest}`;
  return measurerEl.getBoundingClientRect().width;
};

const measureFitFontSize = (measurerEl, containerEl, text) => {
  if (!measurerEl || !containerEl) return undefined;
  measurerEl.textContent = text;
  const baseFontSize = parseFloat(getComputedStyle(measurerEl).fontSize);
  const naturalWidth = measurerEl.getBoundingClientRect().width;
  const containerWidth = containerEl.getBoundingClientRect().width;
  if (!naturalWidth || !containerWidth || naturalWidth <= containerWidth) {
    return baseFontSize;
  }
  return baseFontSize * (containerWidth / naturalWidth);
};

const Theme = () => {
  const [songData, setSongData] = useState();
  const [allArtists, setAllArtists] = useState("");
  const [coverOpacity, setCoverOpacity] = useState(1);

  const songInfoRef = useRef(null);
  const artistMeasurerRef = useRef(null);
  const songMeasurerRef = useRef(null);
  const timeMeasurerRef = useRef(null);
  const [timeTextWidth, setTimeTextWidth] = useState(undefined);

  const fitArtistFontSize = (text) =>
    measureFitFontSize(artistMeasurerRef.current, songInfoRef.current, text);
  const fitSongFontSize = (text) =>
    measureFitFontSize(songMeasurerRef.current, songInfoRef.current, text);

  useEffect(() => {
    const width = measureTimeTextWidth(timeMeasurerRef.current, songData?.duration_ms);
    if (width !== undefined) setTimeTextWidth(width);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songData?.duration_ms]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        window.location.reload();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          "/api/getsong"
        );

        if (!response.data) return;

        if (songData !== undefined && response.data.song == songData.song) {
          // Same song, only progress/playing state may have changed.
          if (
            response.data.progress_ms !== songData.progress_ms ||
            response.data.duration_ms !== songData.duration_ms ||
            response.data.playing !== songData.playing
          ) {
            setSongData(response.data);
          }
          return;
        }

        if (JSON.stringify(response.data) !== JSON.stringify(songData)) {
          setCoverOpacity(0);

          setTimeout(() => {
            setSongData(response.data);

            let artists = "";
            (response.data.artists || []).forEach((artist) => {
              artists += `${artist.name}, `;
            });
            artists = artists.slice(0, -2);
            setAllArtists(artists);

            setCoverOpacity(1);
          }, 200);
        }
      } catch (err) {
        // silently ignore
      }
    };

    const intervalId = setInterval(fetchData, 200);
    return () => clearInterval(intervalId);
  }, [songData]);

  const progressPercent = songData?.duration_ms
    ? Math.min(100, (songData.progress_ms / songData.duration_ms) * 100)
    : 0;

  return (
    <WidgetContainer>
      <CoverArtWrap>
        <CoverArt
          src={
            songData?.coverArtUrl ||
            "/nothingplaying.png"
          }
          alt="Album Cover"
          style={{ opacity: coverOpacity }}
        />
      </CoverArtWrap>

      <SongInfo ref={songInfoRef}>
        <TypewriterText
          as={ArtistText}
          text={allArtists || "NOTHING PLAYING"}
          speed={TYPE_SPEED_MS}
          showCaret
          fitFontSize={fitArtistFontSize}
        />
        <TypewriterText
          as={SongText}
          text={songData?.song || "Open Spotify to get started"}
          speed={TYPE_SPEED_MS}
          fitFontSize={fitSongFontSize}
        />

        <ProgressRow>
          <ProgressTrack>
            <ProgressFill $percent={progressPercent} />
          </ProgressTrack>
          <TimeText style={timeTextWidth !== undefined ? { minWidth: `${timeTextWidth}px` } : undefined}>
            {formatTime(songData?.progress_ms)} / {formatTime(songData?.duration_ms)}
          </TimeText>
        </ProgressRow>
      </SongInfo>

      <Measurer aria-hidden="true">
        <ArtistText ref={artistMeasurerRef} style={{ position: "absolute" }} />
        <SongText ref={songMeasurerRef} style={{ position: "absolute" }} />
        <TimeText ref={timeMeasurerRef} style={{ position: "absolute" }} />
      </Measurer>
    </WidgetContainer>
  );
};

export default Theme;
