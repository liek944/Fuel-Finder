# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - button "Open menu" [ref=e5] [cursor=pointer]: ☰
    - generic [ref=e6]:
      - generic:
        - generic:
          - img
        - button "Marker" [ref=e8] [cursor=pointer]
      - generic:
        - generic [ref=e9]:
          - button "Zoom in" [ref=e10] [cursor=pointer]: +
          - button "Zoom out" [ref=e11] [cursor=pointer]: −
        - button "Layers" [ref=e13] [cursor=pointer]
        - generic [ref=e14]:
          - link "Leaflet" [ref=e15] [cursor=pointer]:
            - /url: https://leafletjs.com
            - img [ref=e16]
            - text: Leaflet
          - text: "| ©"
          - link "OpenStreetMap" [ref=e20] [cursor=pointer]:
            - /url: https://www.openstreetmap.org/copyright
          - text: contributors
      - generic:
        - button "Center map to my location" [ref=e21] [cursor=pointer]: 📍
        - button "Install Fuel Finder App" [ref=e22] [cursor=pointer]:
          - img [ref=e23]
          - generic [ref=e26]: Install App
  - contentinfo [ref=e27]:
    - link "About" [ref=e28] [cursor=pointer]:
      - /url: /about
```