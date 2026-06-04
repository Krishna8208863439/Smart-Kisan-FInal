import { useEffect, useState } from "react";
import api from "../api";

const Forum = () => {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState({ title: "", content: "" });
  const [replyContent, setReplyContent] = useState({});

  const loadPosts = async () => {
    const res = await api.get("/forum/posts");
    setPosts(res.data);
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const createPost = async (e) => {
    e.preventDefault();
    await api.post("/forum/posts", newPost);
    setNewPost({ title: "", content: "" });
    loadPosts();
  };

  const addReply = async (postId) => {
    await api.post(`/forum/posts/${postId}/replies`, {
      content: replyContent[postId]
    });
    setReplyContent({ ...replyContent, [postId]: "" });
    loadPosts();
  };

  return (
    <div className="app-container">
      <div className="card">
        <h2>Community Forum</h2>

        <h3>Create Post</h3>
        <form onSubmit={createPost}>
          <input
            className="input"
            placeholder="Title"
            value={newPost.title}
            onChange={(e) =>
              setNewPost({ ...newPost, title: e.target.value })
            }
          />
          <textarea
            className="input"
            placeholder="Content"
            rows={3}
            value={newPost.content}
            onChange={(e) =>
              setNewPost({ ...newPost, content: e.target.value })
            }
          />
          <button className="button">Post</button>
        </form>

        <hr style={{ margin: "16px 0" }} />

        <h3>Recent Discussions</h3>
        {posts.map((p) => (
          <div
            key={p._id}
            style={{ marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid #e5e7eb" }}
          >
            <h4>{p.title}</h4>
            <p>{p.content}</p>
            <small>By {p.author?.name || "Unknown"}</small>

            <div style={{ marginTop: 8 }}>
              <strong>Replies:</strong>
              <ul>
                {p.replies?.map((r, idx) => (
                  <li key={idx}>
                    <strong>{r.author?.name || "Farmer"}:</strong> {r.content}
                  </li>
                ))}
              </ul>

              <div style={{ marginTop: 8 }}>
                <textarea
                  className="input"
                  placeholder="Reply..."
                  rows={2}
                  value={replyContent[p._id] || ""}
                  onChange={(e) =>
                    setReplyContent({
                      ...replyContent,
                      [p._id]: e.target.value
                    })
                  }
                />
                <button
                  className="button"
                  onClick={() => addReply(p._id)}
                  disabled={!replyContent[p._id]}
                >
                  Reply
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Forum;
