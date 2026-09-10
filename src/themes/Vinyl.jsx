import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import styled, { keyframes } from "styled-components";

const FADE_WIDTH = 30;

const getFadeMask = ({ $showLeftGradient, $showRightGradient }) => {
  const left = $showLeftGradient ? `transparent 0, black ${FADE_WIDTH}px` : "black 0";
  const right = $showRightGradient
    ? `black calc(100% - ${FADE_WIDTH}px), transparent 100%`
    : "black 100%";
  return `linear-gradient(to right, ${left}, ${right})`;
};

const ScrollingContainer = styled.div`
  width: 100%;
  overflow: hidden;
  position: relative;
  -webkit-mask-image: ${getFadeMask};
  mask-image: ${getFadeMask};
`;

const ScrollingText = styled.div`
  white-space: nowrap;
  display: inline-block;
  font-family: "Fraunces", "Georgia", serif;
  font-size: ${({ isSong }) => (isSong ? "2rem" : "1.35rem")};
  font-style: ${({ isSong }) => (isSong ? "italic" : "normal")};
  font-weight: ${({ isSong }) => (isSong ? "600" : "500")};
  letter-spacing: ${({ isSong }) => (isSong ? "0" : "0.12em")};
  text-transform: ${({ isSong }) => (isSong ? "none" : "uppercase")};
  color: ${({ isSong }) => (isSong ? "#2b2118" : "#6b5a45")};
  transition: opacity 0.3s ease;
`;

const WidgetContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  padding: 1.1rem 1.5rem 1.1rem 2.6rem;
  background: linear-gradient(155deg, #faf6ee 0%, #f3ecdd 100%);
  border-radius: 18px;
  border: 1px solid rgba(43, 33, 24, 0.1);
  box-shadow:
    0 16px 36px rgba(43, 33, 24, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  width: 560px;
  gap: 1.4rem;
  font-family: "Fraunces", "Georgia", serif;
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const RecordWrap = styled.div`
  position: relative;
  width: 110px;
  height: 110px;
  flex-shrink: 0;
`;

const Record = styled.div`
  width: 110px;
  height: 110px;
  border-radius: 50%;
  overflow: hidden;
  position: relative;
  box-shadow:
    0 0 0 2px #2b2118,
    0 0 0 5px #faf6ee,
    0 0 0 6px rgba(43, 33, 24, 0.35),
    0 6px 16px rgba(43, 33, 24, 0.35);
  animation: ${spin} 6s linear infinite;
  animation-play-state: ${({ $spinning }) => ($spinning ? "running" : "paused")};
`;

const CoverArt = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: opacity 0.3s ease;
`;

const Spindle = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #faf6ee;
  border: 2px solid #2b2118;
  transform: translate(-50%, -50%);
  z-index: 2;
`;

const SongInfo = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  overflow: hidden;
  flex: 1;
`;

const AccentRule = styled.div`
  width: 34px;
  height: 3px;
  background: #1db954;
  border-radius: 2px;
  margin: 2px 0 4px;
`;

const LogoBadge = styled.img`
  position: absolute;
  top: 14px;
  left: 16px;
  width: 24px;
  height: 24px;
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
    <WidgetContainer>
      <LogoBadge
        src={"/SpotifyBlack.svg"}
        alt="Spotify"
      />
      <RecordWrap>
        <Record $spinning={isPlaying && !isChanging}>
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
        </Record>
        <Spindle />
      </RecordWrap>
      <SongInfo>
        <ScrollingTitle
          text={songData?.song || "Nothing playing!"}
          isSong={true}
          isChanging={isChanging}
          songData={songData}
        />
        <AccentRule />
        <ScrollingTitle
          text={allArtists || ""}
          isChanging={isChanging}
          songData={songData}
        />
      </SongInfo>
    </WidgetContainer>
  );
};

export default Theme;
