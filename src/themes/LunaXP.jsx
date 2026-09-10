import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import styled from "styled-components";

const ScrollingContainer = styled.div`
  width: 100%;
  overflow: hidden;
  position: relative;
`;

const ScrollingText = styled.div`
  white-space: nowrap;
  display: inline-block;
  font-family: "Trebuchet MS", "Segoe UI", Tahoma, sans-serif;
  font-size: ${({ isSong }) => (isSong ? "1.85rem" : "1.3rem")};
  font-weight: ${({ isSong }) => (isSong ? "700" : "400")};
  color: ${({ isSong }) => (isSong ? "#0a246a" : "#39557f")};
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.7);
  transition: opacity 0.3s ease;
`;

const WindowFrame = styled.div`
  width: 560px;
  border-radius: 9px;
  overflow: hidden;
  border: 1px solid #0a246a;
  box-shadow:
    0 14px 30px rgba(0, 0, 0, 0.4),
    inset 0 0 0 1px rgba(255, 255, 255, 0.5);
  font-family: "Trebuchet MS", "Segoe UI", Tahoma, sans-serif;
`;

const TitleBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 30px;
  padding: 0 6px 0 10px;
  background: linear-gradient(
    180deg,
    #5b9bf7 0%,
    #2f6fe0 40%,
    #1348b3 60%,
    #0c3c9e 100%
  );
  border-bottom: 1px solid #0a246a;
  position: relative;

  &::after {
    content: "";
    position: absolute;
    top: 1px;
    left: 1px;
    right: 1px;
    height: 45%;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.55) 0%,
      rgba(255, 255, 255, 0) 100%
    );
    pointer-events: none;
  }
`;

const TitleText = styled.span`
  color: #ffffff;
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: 0.02em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  z-index: 1;
`;

const WinButtons = styled.div`
  display: flex;
  gap: 4px;
  z-index: 1;
`;

const WinButton = styled.div`
  width: 20px;
  height: 19px;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: bold;
  color: #ffffff;
  background: ${({ $variant }) =>
    $variant === "close"
      ? "linear-gradient(180deg, #ff8a80 0%, #d32f2f 50%, #a81c1c 100%)"
      : "linear-gradient(180deg, #7fb0f5 0%, #3d78d8 50%, #1f57b8 100%)"};
  border: 1px solid rgba(0, 0, 0, 0.35);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
`;

const Body = styled.div`
  display: flex;
  align-items: center;
  gap: 1.1rem;
  padding: 1rem 1.3rem;
  background: linear-gradient(180deg, #eef4fc 0%, #d3e2f4 100%);
`;

const CoverFrame = styled.div`
  width: 92px;
  height: 92px;
  flex-shrink: 0;
  padding: 3px;
  background: linear-gradient(180deg, #c7d7ec 0%, #a9c1e0 100%);
  border-radius: 4px;
  box-shadow:
    inset 1px 1px 2px rgba(0, 0, 0, 0.35),
    inset -1px -1px 0 rgba(255, 255, 255, 0.7);
`;

const CoverArt = styled.img`
  width: 100%;
  height: 100%;
  border-radius: 2px;
  object-fit: cover;
  border: 1px solid #6f8fbd;
  transition: opacity 0.3s ease;
`;

const SongInfo = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  overflow: hidden;
  flex: 1;
`;

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StatusLight = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $active }) => ($active ? "#37c837" : "#9db3cf")};
  box-shadow: ${({ $active }) =>
    $active
      ? "0 0 6px rgba(55, 200, 55, 0.8), inset 0 1px 1px rgba(255,255,255,0.6)"
      : "inset 0 1px 1px rgba(255,255,255,0.4)"};
  border: 1px solid rgba(0, 0, 0, 0.25);
`;

const StatusText = styled.span`
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #4d6690;
`;

const LogoBadge = styled.img`
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  object-fit: contain;
  opacity: 0.85;
`;

const PIXELS_PER_SECOND = 100;
const PAUSE_DURATION = 1000;

const ScrollingTitle = ({ text, isSong = false, isChanging, songData }) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const intervalRef = useRef(null);
  const abortControllerRef = useRef(null);
  const shouldScrollRef = useRef(false);

  const [shouldScroll, setShouldScroll] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [scrollDuration, setScrollDuration] = useState(0);
  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(false);
  const [textOpacity, setTextOpacity] = useState(1);
  const [isResetting, setIsResetting] = useState(false);

  // Reset all states when text changes
  useEffect(() => {
    // Cleanup previous animation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Reset states
    setScrollPosition(0);
    setShowLeftGradient(false);
    setShowRightGradient(false);
    setTextOpacity(1);
    setIsResetting(false);
  }, [text]);

  // Update ref when shouldScroll changes
  useEffect(() => {
    shouldScrollRef.current = shouldScroll;
  }, [shouldScroll]);

  const sleep = (ms, signal) => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, ms);
      signal?.addEventListener("abort", () => {
        clearTimeout(timeout);
        reject(new Error("Animation aborted"));
      });
    });
  };

  useEffect(() => {
    const checkScroll = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const textWidth = textRef.current.offsetWidth;
        const needsScroll = textWidth > containerWidth;

        if (needsScroll !== shouldScroll) {
          // Clean up previous scroll state if switching modes
          setScrollPosition(0);
          setShowLeftGradient(false);
          setShowRightGradient(false);
          setTextOpacity(1);
          setIsResetting(false);

          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
          }
        }

        setShouldScroll(needsScroll);
        shouldScrollRef.current = needsScroll;

        if (needsScroll) {
          const distance = textWidth - containerWidth;
          setScrollDuration(distance / PIXELS_PER_SECOND);
        }

        return { containerWidth, textWidth };
      }
      return null;
    };

    const startScrollCycle = ({ containerWidth, textWidth }) => {
      if (!shouldScrollRef.current) return () => {};

      const scrollDistance = textWidth - containerWidth;

      const cycle = async () => {
        try {
          // Create new AbortController for this cycle
          abortControllerRef.current = new AbortController();
          const signal = abortControllerRef.current.signal;

          // Reset position
          setIsResetting(true);
          setScrollPosition(0);
          setShowRightGradient(true);
          setShowLeftGradient(false);

          await sleep(50, signal);
          setIsResetting(false);
          setTextOpacity(1);

          // Initial pause
          await sleep(PAUSE_DURATION, signal);

          // Start scroll
          setShowLeftGradient(true);
          setScrollPosition(-scrollDistance);

          // Wait for scroll
          await sleep(scrollDuration * 1000, signal);

          // End pause
          setShowRightGradient(false);
          await sleep(PAUSE_DURATION, signal);

          // Fade out
          setTextOpacity(0);
          await sleep(300, signal);

          // Wait for gradient
          await sleep(PAUSE_DURATION, signal);
        } catch (error) {
          if (error.message === "Animation aborted") {
            return;
          }
          throw error;
        }
      };

      cycle();
      intervalRef.current = setInterval(
        cycle,
        scrollDuration * 1000 + PAUSE_DURATION * 2 + 350
      );

      return () => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        // Reset states
        setScrollPosition(0);
        setShowLeftGradient(false);
        setShowRightGradient(false);
        setTextOpacity(1);
        setIsResetting(false);
      };
    };

    const dimensions = checkScroll();
    if (dimensions) {
      return startScrollCycle(dimensions);
    }
  }, [text, scrollDuration]);

  const getTransitionStyle = () => {
    if (!shouldScroll) return "opacity 0.3s ease";
    if (isResetting) return "none";
    return `transform ${scrollDuration}s linear, opacity 0.3s ease`;
  };

  return (
    <ScrollingContainer
      ref={containerRef}
      $showLeftGradient={showLeftGradient}
      $showRightGradient={showRightGradient}
      >
      <ScrollingText
        ref={textRef}
        isSong={isSong}
        style={{
          transform: shouldScroll
            ? `translateX(${scrollPosition}px)`
            : `translateX(0)`,
          opacity: isChanging ? 0 : textOpacity,
          transition: getTransitionStyle(),
          animationFillMode: "forwards",
          display: songData?.song || isSong ? "inline-block" : "none"
        }}>
        {text}
      </ScrollingText>
    </ScrollingContainer>
  );
};

const Theme = () => {
  const [songData, setSongData] = useState();
  const [allArtists, setAllArtists] = useState();
  const [isChanging, setIsChanging] = useState(true); // Start true to let the data load
  const [pendingData, setPendingData] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page is visible again, refresh
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
      const response = await axios.get(
        "/api/getsong"
      );
      if (
        response.data &&
        JSON.stringify(response.data) !== JSON.stringify(songData)
      ) {
        if (songData !== undefined) {
          if (
            response.data.playing != songData.playing &&
            response.data.song == songData.song
          ) {
            // If the songs are the same, just set isPlaying and songData. The song was likely paused.
            setIsPlaying(response.data.playing);
            setSongData(response.data);
            return;
          }
        }

        setIsPlaying(response.data.playing);
        setIsChanging(true);
        setPendingData(response.data);
        setTimeout(() => {
          if (pendingData) {
            setSongData(pendingData);
            setPendingData(null);

            // Compile all artist names into one string
            var artists = "";
            response.data.artists.forEach((artist) => {
              artists += `${artist.name}, `;
            });
            artists = artists.slice(0, -2); // Remove the last comma and space
            setAllArtists(artists);

            // Wait for new content to render, then fade in
            setTimeout(() => {
              setIsChanging(false);
            }, 100);
          }
        }, 300);
      }
    };

    const intervalId = setInterval(fetchData, 200);
    return () => clearInterval(intervalId);
  }, [songData, isChanging, pendingData]);

  return (
    <WindowFrame>
      <TitleBar>
        <TitleText>Syncify Media Player</TitleText>
        <WinButtons>
          <WinButton $variant="min">_</WinButton>
          <WinButton $variant="max">&#9633;</WinButton>
          <WinButton $variant="close">&#10005;</WinButton>
        </WinButtons>
      </TitleBar>
      <Body>
        <CoverFrame>
          <CoverArt
            src={
              songData?.coverArtUrl ||
              "/nothingplaying.png"
            }
            alt="Album Cover"
            style={{
              opacity: isChanging ? 0 : 1,
            }}
          />
        </CoverFrame>
        <SongInfo>
          <StatusRow>
            <StatusLight $active={isPlaying && !isChanging} />
            <StatusText>{isPlaying ? "Now Playing" : "Paused"}</StatusText>
          </StatusRow>
          <ScrollingTitle
            text={songData?.song || "Nothing playing!"}
            isSong={true}
            isChanging={isChanging}
            songData={songData}
          />
          <ScrollingTitle
            text={allArtists || ""}
            isChanging={isChanging}
            songData={songData}
          />
        </SongInfo>
        <LogoBadge
          src={"/SpotifyBlack.svg"}
          alt="Spotify"
        />
      </Body>
    </WindowFrame>
  );
};

export default Theme;
