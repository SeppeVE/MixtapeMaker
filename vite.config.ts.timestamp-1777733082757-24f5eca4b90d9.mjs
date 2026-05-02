// vite.config.ts
import { defineConfig, loadEnv } from "file:///sessions/dazzling-vigilant-ride/mnt/mixtape-app/node_modules/vite/dist/node/index.js";
import react from "file:///sessions/dazzling-vigilant-ride/mnt/mixtape-app/node_modules/@vitejs/plugin-react/dist/index.js";
var devToken = null;
var devTokenExpiry = 0;
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      react(),
      {
        name: "dev-spotify-api",
        configureServer(server) {
          server.middlewares.use("/api/spotify/search", async (req, res) => {
            const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
            const q = url.searchParams.get("q");
            if (!q?.trim()) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Missing query parameter: q" }));
              return;
            }
            try {
              if (!devToken || Date.now() >= devTokenExpiry) {
                const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: "Basic " + Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString("base64")
                  },
                  body: "grant_type=client_credentials"
                });
                if (!tokenRes.ok) throw new Error("Token request failed");
                const tokenData = await tokenRes.json();
                devToken = tokenData.access_token;
                devTokenExpiry = Date.now() + tokenData.expires_in * 1e3 - 6e4;
              }
              const searchRes = await fetch(
                `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=5`,
                { headers: { Authorization: `Bearer ${devToken}` } }
              );
              if (!searchRes.ok) throw new Error("Spotify search failed");
              const data = await searchRes.json();
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify(data));
            } catch (err) {
              console.error("[dev-spotify-api]", err);
              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "Search failed" }));
            }
          });
        }
      }
    ]
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvc2Vzc2lvbnMvZGF6emxpbmctdmlnaWxhbnQtcmlkZS9tbnQvbWl4dGFwZS1hcHBcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9zZXNzaW9ucy9kYXp6bGluZy12aWdpbGFudC1yaWRlL21udC9taXh0YXBlLWFwcC92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vc2Vzc2lvbnMvZGF6emxpbmctdmlnaWxhbnQtcmlkZS9tbnQvbWl4dGFwZS1hcHAvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IHR5cGUgeyBJbmNvbWluZ01lc3NhZ2UsIFNlcnZlclJlc3BvbnNlIH0gZnJvbSAnbm9kZTpodHRwJ1xuXG5sZXQgZGV2VG9rZW46IHN0cmluZyB8IG51bGwgPSBudWxsXG5sZXQgZGV2VG9rZW5FeHBpcnkgPSAwXG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcbiAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBwcm9jZXNzLmN3ZCgpLCAnJylcblxuICByZXR1cm4ge1xuICAgIHBsdWdpbnM6IFtcbiAgICAgIHJlYWN0KCksXG4gICAgICB7XG4gICAgICAgIG5hbWU6ICdkZXYtc3BvdGlmeS1hcGknLFxuICAgICAgICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyKSB7XG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgnL2FwaS9zcG90aWZ5L3NlYXJjaCcsIGFzeW5jIChyZXE6IEluY29taW5nTWVzc2FnZSwgcmVzOiBTZXJ2ZXJSZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdXJsID0gbmV3IFVSTChyZXEudXJsID8/ICcvJywgYGh0dHA6Ly8ke3JlcS5oZWFkZXJzLmhvc3R9YClcbiAgICAgICAgICAgIGNvbnN0IHEgPSB1cmwuc2VhcmNoUGFyYW1zLmdldCgncScpXG5cbiAgICAgICAgICAgIGlmICghcT8udHJpbSgpKSB7XG4gICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwLCB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSlcbiAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnTWlzc2luZyBxdWVyeSBwYXJhbWV0ZXI6IHEnIH0pKVxuICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgLy8gUmVmcmVzaCB0b2tlbiBpZiBuZWVkZWRcbiAgICAgICAgICAgICAgaWYgKCFkZXZUb2tlbiB8fCBEYXRlLm5vdygpID49IGRldlRva2VuRXhwaXJ5KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdG9rZW5SZXMgPSBhd2FpdCBmZXRjaCgnaHR0cHM6Ly9hY2NvdW50cy5zcG90aWZ5LmNvbS9hcGkvdG9rZW4nLCB7XG4gICAgICAgICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnLFxuICAgICAgICAgICAgICAgICAgICBBdXRob3JpemF0aW9uOlxuICAgICAgICAgICAgICAgICAgICAgICdCYXNpYyAnICtcbiAgICAgICAgICAgICAgICAgICAgICBCdWZmZXIuZnJvbShgJHtlbnYuU1BPVElGWV9DTElFTlRfSUR9OiR7ZW52LlNQT1RJRllfQ0xJRU5UX1NFQ1JFVH1gKS50b1N0cmluZygnYmFzZTY0JyksXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgYm9keTogJ2dyYW50X3R5cGU9Y2xpZW50X2NyZWRlbnRpYWxzJyxcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIGlmICghdG9rZW5SZXMub2spIHRocm93IG5ldyBFcnJvcignVG9rZW4gcmVxdWVzdCBmYWlsZWQnKVxuICAgICAgICAgICAgICAgIGNvbnN0IHRva2VuRGF0YSA9IGF3YWl0IHRva2VuUmVzLmpzb24oKVxuICAgICAgICAgICAgICAgIGRldlRva2VuID0gdG9rZW5EYXRhLmFjY2Vzc190b2tlblxuICAgICAgICAgICAgICAgIGRldlRva2VuRXhwaXJ5ID0gRGF0ZS5ub3coKSArIHRva2VuRGF0YS5leHBpcmVzX2luICogMTAwMCAtIDYwXzAwMFxuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgY29uc3Qgc2VhcmNoUmVzID0gYXdhaXQgZmV0Y2goXG4gICAgICAgICAgICAgICAgYGh0dHBzOi8vYXBpLnNwb3RpZnkuY29tL3YxL3NlYXJjaD9xPSR7ZW5jb2RlVVJJQ29tcG9uZW50KHEpfSZ0eXBlPXRyYWNrJmxpbWl0PTVgLFxuICAgICAgICAgICAgICAgIHsgaGVhZGVyczogeyBBdXRob3JpemF0aW9uOiBgQmVhcmVyICR7ZGV2VG9rZW59YCB9IH1cbiAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICBpZiAoIXNlYXJjaFJlcy5vaykgdGhyb3cgbmV3IEVycm9yKCdTcG90aWZ5IHNlYXJjaCBmYWlsZWQnKVxuXG4gICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBzZWFyY2hSZXMuanNvbigpXG4gICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwLCB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSlcbiAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeShkYXRhKSlcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbZGV2LXNwb3RpZnktYXBpXScsIGVycilcbiAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg1MDAsIHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9KVxuICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdTZWFyY2ggZmFpbGVkJyB9KSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICBdLFxuICB9XG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFrVSxTQUFTLGNBQWMsZUFBZTtBQUN4VyxPQUFPLFdBQVc7QUFHbEIsSUFBSSxXQUEwQjtBQUM5QixJQUFJLGlCQUFpQjtBQUVyQixJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUN4QyxRQUFNLE1BQU0sUUFBUSxNQUFNLFFBQVEsSUFBSSxHQUFHLEVBQUU7QUFFM0MsU0FBTztBQUFBLElBQ0wsU0FBUztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ047QUFBQSxRQUNFLE1BQU07QUFBQSxRQUNOLGdCQUFnQixRQUFRO0FBQ3RCLGlCQUFPLFlBQVksSUFBSSx1QkFBdUIsT0FBTyxLQUFzQixRQUF3QjtBQUNqRyxrQkFBTSxNQUFNLElBQUksSUFBSSxJQUFJLE9BQU8sS0FBSyxVQUFVLElBQUksUUFBUSxJQUFJLEVBQUU7QUFDaEUsa0JBQU0sSUFBSSxJQUFJLGFBQWEsSUFBSSxHQUFHO0FBRWxDLGdCQUFJLENBQUMsR0FBRyxLQUFLLEdBQUc7QUFDZCxrQkFBSSxVQUFVLEtBQUssRUFBRSxnQkFBZ0IsbUJBQW1CLENBQUM7QUFDekQsa0JBQUksSUFBSSxLQUFLLFVBQVUsRUFBRSxPQUFPLDZCQUE2QixDQUFDLENBQUM7QUFDL0Q7QUFBQSxZQUNGO0FBRUEsZ0JBQUk7QUFFRixrQkFBSSxDQUFDLFlBQVksS0FBSyxJQUFJLEtBQUssZ0JBQWdCO0FBQzdDLHNCQUFNLFdBQVcsTUFBTSxNQUFNLDBDQUEwQztBQUFBLGtCQUNyRSxRQUFRO0FBQUEsa0JBQ1IsU0FBUztBQUFBLG9CQUNQLGdCQUFnQjtBQUFBLG9CQUNoQixlQUNFLFdBQ0EsT0FBTyxLQUFLLEdBQUcsSUFBSSxpQkFBaUIsSUFBSSxJQUFJLHFCQUFxQixFQUFFLEVBQUUsU0FBUyxRQUFRO0FBQUEsa0JBQzFGO0FBQUEsa0JBQ0EsTUFBTTtBQUFBLGdCQUNSLENBQUM7QUFDRCxvQkFBSSxDQUFDLFNBQVMsR0FBSSxPQUFNLElBQUksTUFBTSxzQkFBc0I7QUFDeEQsc0JBQU0sWUFBWSxNQUFNLFNBQVMsS0FBSztBQUN0QywyQkFBVyxVQUFVO0FBQ3JCLGlDQUFpQixLQUFLLElBQUksSUFBSSxVQUFVLGFBQWEsTUFBTztBQUFBLGNBQzlEO0FBRUEsb0JBQU0sWUFBWSxNQUFNO0FBQUEsZ0JBQ3RCLHVDQUF1QyxtQkFBbUIsQ0FBQyxDQUFDO0FBQUEsZ0JBQzVELEVBQUUsU0FBUyxFQUFFLGVBQWUsVUFBVSxRQUFRLEdBQUcsRUFBRTtBQUFBLGNBQ3JEO0FBQ0Esa0JBQUksQ0FBQyxVQUFVLEdBQUksT0FBTSxJQUFJLE1BQU0sdUJBQXVCO0FBRTFELG9CQUFNLE9BQU8sTUFBTSxVQUFVLEtBQUs7QUFDbEMsa0JBQUksVUFBVSxLQUFLLEVBQUUsZ0JBQWdCLG1CQUFtQixDQUFDO0FBQ3pELGtCQUFJLElBQUksS0FBSyxVQUFVLElBQUksQ0FBQztBQUFBLFlBQzlCLFNBQVMsS0FBSztBQUNaLHNCQUFRLE1BQU0scUJBQXFCLEdBQUc7QUFDdEMsa0JBQUksVUFBVSxLQUFLLEVBQUUsZ0JBQWdCLG1CQUFtQixDQUFDO0FBQ3pELGtCQUFJLElBQUksS0FBSyxVQUFVLEVBQUUsT0FBTyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQUEsWUFDcEQ7QUFBQSxVQUNGLENBQUM7QUFBQSxRQUNIO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
