import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import styled, { keyframes } from "styled-components";

const ScrollingContainer = styled.div`
  width: 100%;
  overflow: hidden;
  position: relative;
`;

const ScrollingText = styled.div`
  white-space: nowrap;
  display: inline-block;
  font-family: "Trebuchet MS", "Segoe UI", Tahoma, sans-serif;
  letter-spacing: 0.04em;
  font-size: ${({ isSong }) => (isSong ? "1.7rem" : "1.25rem")};
  font-weight: ${({ isSong }) => (isSong ? "700" : "500")};
  color: ${({ isSong }) => (isSong ? "#4dff7c" : "#2fcf5f")};
  text-shadow: ${({ isSong }) =>
    isSong
      ? "0 0 8px rgba(77, 255, 124, 0.65)"
      : "0 0 5px rgba(47, 207, 95, 0.5)"};
  transition: opacity 0.3s ease;
`;

const screw = (pos) => `
  position: absolute;
  ${pos}
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #e6e6e6, #8a8a8a 55%, #333 100%);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);

  &::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 15%;
    right: 15%;
    height: 1.5px;
    background: rgba(0, 0, 0, 0.55);
    transform: translateY(-50%) rotate(35deg);
  }
`;

const Chassis = styled.div`
  position: relative;
  width: 560px;
  padding: 1.1rem 1.2rem;
  background:
    repeating-linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.025) 0px,
      rgba(255, 255, 255, 0.025) 1px,
      transparent 1px,
      transparent 3px
    ),
    linear-gradient(180deg, #5a5a5a 0%, #3c3c3c 45%, #262626 100%);
  border-radius: 8px;
  border: 1px solid #1a1a1a;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.25),
    inset 0 -1px 0 rgba(0, 0, 0, 0.6),
    0 16px 34px rgba(0, 0, 0, 0.55);
  font-family: "Trebuchet MS", "Segoe UI", Tahoma, sans-serif;
`;

const ScrewTL = styled.div`${screw("top: 8px; left: 8px;")}`;
const ScrewTR = styled.div`${screw("top: 8px; right: 8px;")}`;
const ScrewBL = styled.div`${screw("bottom: 8px; left: 8px;")}`;
const ScrewBR = styled.div`${screw("bottom: 8px; right: 8px;")}`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const BezelFrame = styled.div`
  flex-shrink: 0;
  width: 92px;
  height: 92px;
  padding: 3px;
  background: linear-gradient(180deg, #6e6e6e 0%, #2b2b2b 100%);
  border-radius: 5px;
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.3),
    inset 0 -1px 1px rgba(0, 0, 0, 0.6);
`;

const CoverArt = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 2px;
  border: 1px solid #111;
  transition: opacity 0.3s ease;
`;

const glow = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
`;

const PowerLed = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $active }) => ($active ? "#4dff7c" : "#2a3a2a")};
  box-shadow: ${({ $active }) =>
    $active ? "0 0 7px rgba(77, 255, 124, 0.9)" : "none"};
  animation: ${({ $active }) => ($active ? glow : "none")} 1.6s ease-in-out infinite;
`;

const Screen = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0.7rem 0.9rem;
  background: linear-gradient(180deg, #001f00 0%, #000d00 100%);
  border-radius: 4px;
  box-shadow:
    inset 0 2px 6px rgba(0, 0, 0, 0.8),
    inset 0 0 0 1px #000;
`;

const ScreenHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: "Trebuchet MS", "Segoe UI", Tahoma, sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #2fcf5f;
  opacity: 0.85;
`;

const LogoBadge = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 5px;
  background: linear-gradient(180deg, #6e6e6e 0%, #2b2b2b 100%);
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.3),
    inset 0 -1px 1px rgba(0, 0, 0, 0.6);
`;

const LogoImg = styled.img`
  width: 22px;
  height: 22px;
  object-fit: contain;
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
        `http://localhost:${window.location.port}/api/getsong`
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
    <Chassis>
      <ScrewTL />
      <ScrewTR />
      <ScrewBL />
      <ScrewBR />
      <Row>
        <BezelFrame>
          <CoverArt
            src={
              songData?.coverArtUrl ||
              `http://localhost:${window.location.port}/nothingplaying.png`
            }
            alt="Album Cover"
            style={{
              opacity: isChanging ? 0 : 1,
            }}
          />
        </BezelFrame>
        <Screen>
          <ScreenHeader>
            <PowerLed $active={isPlaying && !isChanging} />
            {isPlaying ? "Playing" : "Standby"}
          </ScreenHeader>
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
        </Screen>
        <LogoBadge>
          <LogoImg
            src={`http://localhost:${window.location.port}/SpotifyWhite.svg`}
            alt="Spotify"
          />
        </LogoBadge>
      </Row>
    </Chassis>
  );
};

export default Theme;
