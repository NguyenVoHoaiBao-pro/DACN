import { useState } from "react";
import {
  useCreatePostMutation,
  useDeletePostMutation,
  useGetPostsQuery,
  useGetUsersQuery,
  useUpdatePostMutation,
} from "../redux/apiSlice";

const RTKQueryDemo = () => {
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostBody, setNewPostBody] = useState("");

  // Query hooks - tự động fetch data và manage loading/error states
  const {
    data: posts,
    error: postsError,
    isLoading: postsLoading,
    refetch: refetchPosts,
  } = useGetPostsQuery();

  const {
    data: users,
    error: usersError,
    isLoading: usersLoading,
  } = useGetUsersQuery();

  // Mutation hooks - để thực hiện create/update/delete
  const [createPost, { isLoading: isCreating }] = useCreatePostMutation();
  const [updatePost, { isLoading: isUpdating }] = useUpdatePostMutation();
  const [deletePost, { isLoading: isDeleting }] = useDeletePostMutation();

  const handleCreatePost = async () => {
    if (newPostTitle.trim() && newPostBody.trim()) {
      try {
        await createPost({
          title: newPostTitle,
          body: newPostBody,
          userId: 1,
        }).unwrap();

        setNewPostTitle("");
        setNewPostBody("");
        alert("Post created successfully!");
      } catch (error) {
        alert("Failed to create post");
      }
    }
  };

  const handleUpdatePost = async (postId, newTitle) => {
    try {
      await updatePost({
        id: postId,
        title: newTitle,
      }).unwrap();

      alert("Post updated successfully!");
    } catch (error) {
      alert("Failed to update post");
    }
  };

  const handleDeletePost = async (postId) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      try {
        await deletePost(postId).unwrap();
        alert("Post deleted successfully!");
      } catch (error) {
        alert("Failed to delete post");
      }
    }
  };

  if (postsLoading) return <div>Loading posts...</div>;
  if (postsError) return <div>Error loading posts: {postsError.message}</div>;

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>RTK Query Demo</h1>

      {/* Create New Post Section */}
      <div
        style={{
          marginBottom: "30px",
          padding: "20px",
          border: "1px solid #ddd",
        }}
      >
        <h2>Create New Post</h2>
        <div style={{ marginBottom: "10px" }}>
          <input
            type="text"
            placeholder="Post title"
            value={newPostTitle}
            onChange={(e) => setNewPostTitle(e.target.value)}
            style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
          />
          <textarea
            placeholder="Post body"
            value={newPostBody}
            onChange={(e) => setNewPostBody(e.target.value)}
            style={{ width: "100%", padding: "8px", minHeight: "100px" }}
          />
        </div>
        <button
          onClick={handleCreatePost}
          disabled={isCreating || !newPostTitle.trim() || !newPostBody.trim()}
          style={{
            padding: "10px 20px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          {isCreating ? "Creating..." : "Create Post"}
        </button>
      </div>

      {/* Posts List */}
      <div style={{ marginBottom: "30px" }}>
        <h2>Posts ({posts?.length || 0})</h2>
        <button onClick={refetchPosts} style={{ marginBottom: "10px" }}>
          Refetch Posts
        </button>

        <div style={{ maxHeight: "400px", overflowY: "auto" }}>
          {posts?.map((post) => (
            <div
              key={post.id}
              style={{
                border: "1px solid #eee",
                padding: "15px",
                marginBottom: "10px",
                backgroundColor: "#f9f9f9",
              }}
            >
              <h3>{post.title}</h3>
              <p>{post.body}</p>
              <div>
                <button
                  onClick={() => {
                    const newTitle = prompt("Enter new title:", post.title);
                    if (newTitle) handleUpdatePost(post.id, newTitle);
                  }}
                  disabled={isUpdating}
                  style={{ marginRight: "10px" }}
                >
                  {isUpdating ? "Updating..." : "Edit"}
                </button>
                <button
                  onClick={() => handleDeletePost(post.id)}
                  disabled={isDeleting}
                  style={{ backgroundColor: "#dc3545", color: "white" }}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Users List */}
      <div>
        <h2>Users</h2>
        {usersLoading ? (
          <div>Loading users...</div>
        ) : usersError ? (
          <div>Error loading users: {usersError.message}</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "15px",
            }}
          >
            {users?.map((user) => (
              <div
                key={user.id}
                style={{
                  border: "1px solid #ddd",
                  padding: "15px",
                  borderRadius: "5px",
                }}
              >
                <h4>{user.name}</h4>
                <p>Email: {user.email}</p>
                <p>Phone: {user.phone}</p>
                <p>Website: {user.website}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RTKQueryDemo;
