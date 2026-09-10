import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import styled from "styled-components";

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
  font-family: "Oswald", "Arial Narrow", sans-serif;
  text-transform: uppercase;
  font-size: ${({ isSong }) => (isSong ? "2.15rem" : "1.4rem")};
  font-weight: ${({ isSong }) => (isSong ? "600" : "500")};
  letter-spacing: ${({ isSong }) => (isSong ? "0.01em" : "0.1em")};
  color: ${({ isSong }) => (isSong ? "#ffffff" : "#1ed760")};
  transition: opacity 0.3s ease;
`;

const WidgetContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  padding: 1rem 1.3rem;
  background: #0a0a0a;
  border-radius: 6px;
  border: 3px solid #ffffff;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.55);
  width: 560px;
  gap: 1.2rem;
  font-family: "Oswald", "Arial Narrow", sans-serif;
`;

const CoverArt = styled.img`
  width: 96px;
  height: 96px;
  object-fit: cover;
  border: 3px solid #ffffff;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5);
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

const Kicker = styled.div`
  font-family: "Oswald", "Arial Narrow", sans-serif;
  text-transform: uppercase;
  font-size: 1.05rem;
  font-weight: 500;
  letter-spacing: 0.28em;
  color: rgba(255, 255, 255, 0.55);
  margin-bottom: 2px;
`;

const Rule = styled.div`
  width: 100%;
  height: 2px;
  background: linear-gradient(to right, #1ed760, rgba(255, 255, 255, 0.08));
  margin: 5px 0;
`;

const LogoBadge = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.04);
`;

const LogoImg = styled.img`
  width: 20px;
  height: 20px;
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
      <SongInfo>
        <Kicker>{isPlaying ? "Now Playing" : "Up Next"}</Kicker>
        <ScrollingTitle
          text={songData?.song || "Nothing playing!"}
          isSong={true}
          isChanging={isChanging}
          songData={songData}
        />
        <Rule />
        <ScrollingTitle
          text={allArtists || ""}
          isChanging={isChanging}
          songData={songData}
        />
      </SongInfo>
      <LogoBadge>
        <LogoImg
          src={"/SpotifyWhite.svg"}
          alt="Spotify"
        />
      </LogoBadge>
    </WidgetContainer>
  );
};

export default Theme;
