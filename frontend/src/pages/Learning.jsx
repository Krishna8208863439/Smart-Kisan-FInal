import { useEffect, useState } from "react";
import api from "../api";

const Learning = () => {
  const [lessons, setLessons] = useState([]);

  useEffect(() => {
    api.get("/learning").then((res) => setLessons(res.data));
  }, []);

  return (
    <div className="app-container">
      <div className="card">
        <h2>Learning Resources</h2>
        <ul>
          {lessons.map((l) => (
            <li key={l.id} style={{ marginBottom: 8 }}>
              <strong>{l.title}</strong> ({l.category}) –{" "}
              <a href={l.url} target="_blank" rel="noreferrer">
                Open
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Learning;
