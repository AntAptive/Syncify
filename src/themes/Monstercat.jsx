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

const WidgetContainer = styled.div`
  display: flex;
  align-items: center;
  gap: calc(${ART_SIZE} * 0.23);
  padding: ${WIDGET_PADDING};
  width: fit-content;
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
  width: calc(${ART_SIZE} * 6);
  flex: 0 0 calc(${ART_SIZE} * 6);
  overflow: visible;
`;

const ArtistText = styled.div`
  font-family: "Montserrat", "Helvetica Neue", Arial, sans-serif;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: -0.11em;
  font-size: calc(${ART_SIZE} * 0.42);
  line-height: 1.1;
  height: 1.1em;
  white-space: nowrap;
  text-align: left;
  color: #ffffff;
  text-shadow: 0 calc(${ART_SIZE} * 0.02) calc(${ART_SIZE} * 0.04) rgba(0, 0, 0, 0.45);
`;

const SongText = styled.div`
  font-family: "Montserrat", "Helvetica Neue", Arial, sans-serif;
  font-weight: normal;
  text-transform: uppercase;
  letter-spacing: -0.13em;
  font-size: calc(${ART_SIZE} * 0.27);
  line-height: 1.2;
  height: 1.2em;
  white-space: nowrap;
  text-align: left;
  color: #ffffff;
  text-shadow: 0 calc(${ART_SIZE} * 0.02) calc(${ART_SIZE} * 0.04) rgba(0, 0, 0, 0.4);
`;

const Caret = styled.span`
  display: inline-block;
  width: calc(${ART_SIZE} * 0.025);
  margin-left: calc(${ART_SIZE} * 0.025);
  background: currentColor;
  animation: ${blink} 1s step-end infinite;
`;

const TypewriterText = ({ text = "", speed = TYPE_SPEED_MS, as: Component = "div", showCaret = false, ...rest }) => {
  const [displayed, setDisplayed] = useState(text);
  const prevTextRef = useRef(text);
  const timeoutRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);

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
    <Component {...rest}>
      {displayed}
      {showCaret && isAnimating && <Caret />}
    </Component>
  );
};

const Theme = () => {
  const [songData, setSongData] = useState();
  const [allArtists, setAllArtists] = useState("");
  const [coverOpacity, setCoverOpacity] = useState(1);

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

        if (
          response.data &&
          JSON.stringify(response.data) !== JSON.stringify(songData)
        ) {
          if (songData !== undefined) {
            if (
              response.data.playing != songData.playing &&
              response.data.song == songData.song
            ) {
              // Same song, likely just paused/resumed.
              setSongData(response.data);
              return;
            }
          }

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

      <SongInfo>
        <TypewriterText
          as={ArtistText}
          text={allArtists || "NOTHING PLAYING"}
          speed={TYPE_SPEED_MS}
          showCaret
        />
        <TypewriterText
          as={SongText}
          text={songData?.song || "Open Spotify to get started"}
          speed={TYPE_SPEED_MS}
        />
      </SongInfo>
    </WidgetContainer>
  );
};

export default Theme;
