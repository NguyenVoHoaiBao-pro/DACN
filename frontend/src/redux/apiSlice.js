import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Định nghĩa API slice sử dụng RTK Query
export const apiSlice = createApi({
  // Tên của slice
  reducerPath: "api",

  // Base query function - sử dụng fetchBaseQuery cho HTTP requests
  baseQuery: fetchBaseQuery({
    // URL cơ sở cho tất cả requests
    baseUrl: "https://jsonplaceholder.typicode.com",

    // Cấu hình headers mặc định
    prepareHeaders: (headers, { getState }) => {
      // Có thể thêm authorization token hoặc headers khác
      headers.set("Content-Type", "application/json");
      return headers;
    },
  }),

  // Tag types - dùng cho cache invalidation
  tagTypes: ["Post", "User", "Product"],

  // Định nghĩa các endpoints
  endpoints: (builder) => ({
    // Query để lấy danh sách posts
    getPosts: builder.query({
      query: () => "/posts",
      providesTags: ["Post"],
    }),

    // Query để lấy một post theo ID
    getPost: builder.query({
      query: (id) => `/posts/${id}`,
      providesTags: (result, error, id) => [{ type: "Post", id }],
    }),

    // Query để lấy danh sách users
    getUsers: builder.query({
      query: () => "/users",
      providesTags: ["User"],
    }),

    // Mutation để tạo post mới
    createPost: builder.mutation({
      query: (newPost) => ({
        url: "/posts",
        method: "POST",
        body: newPost,
      }),
      invalidatesTags: ["Post"],
    }),

    // Mutation để cập nhật post
    updatePost: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/posts/${id}`,
        method: "PATCH",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Post", id }],
    }),

    // Mutation để xóa post
    deletePost: builder.mutation({
      query: (id) => ({
        url: `/posts/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Post"],
    }),
  }),
});

// Export các hooks được tự động generate
export const {
  useGetPostsQuery,
  useGetPostQuery,
  useGetUsersQuery,
  useCreatePostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
} = apiSlice;
