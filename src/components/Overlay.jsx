import { useProgress } from "@react-three/drei";
import { usePlay } from "../contexts/Play";

export const Overlay = () => {
  const { progress } = useProgress();
  const { play, end, setPlay, hasScroll } = usePlay();
  return (
    <div
      className={`overlay ${play ? "overlay--disable" : ""}
    ${hasScroll ? "overlay--scrolled" : ""}`}
    >
      <div
        className={`loader ${progress === 100 ? "loader--disappear" : ""}`}
      />
      {progress === 100 && (
        <div className={`intro ${play ? "intro--disappear" : ""}`}>
          
          <h1 className="logo">
            SHREYAN GHIMIRE
            
          </h1>
          
          <p className="intro__scroll">Scroll to continue</p>
          <button
            className="explore"
            onClick={() => {
              setPlay(true);
            }}
          >
            Continue
          </button>
    
        </div>
      )}
      <div className={`outro ${end ? "outro--appear" : ""}`}>
        <div className="spinner">
              <div className="spinner__image" />
        </div>
        <p className="outro__text">Please hire me!
        </p>
      </div>
    </div>
  );
};
