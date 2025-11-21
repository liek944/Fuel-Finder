# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - button "Open menu" [ref=e5] [cursor=pointer]: ☰
    - generic [ref=e6]:
      - generic:
        - generic:
          - img
        - button "Marker" [active] [ref=e8] [cursor=pointer]
        - generic [ref=e9]:
          - generic [ref=e12]:
            - generic [ref=e13]: 📍 Your Location
            - generic [ref=e14]: Current position
            - generic [ref=e15]: 12.596600, 121.525800
          - button "Close popup" [ref=e17] [cursor=pointer]: ×
      - generic:
        - generic [ref=e18]:
          - button "Zoom in" [ref=e19] [cursor=pointer]: +
          - button "Zoom out" [ref=e20] [cursor=pointer]: −
        - button "Layers" [ref=e22] [cursor=pointer]
        - generic [ref=e23]:
          - link "Leaflet" [ref=e24] [cursor=pointer]:
            - /url: https://leafletjs.com
            - img [ref=e25]
            - text: Leaflet
          - text: "| ©"
          - link "OpenStreetMap" [ref=e29] [cursor=pointer]:
            - /url: https://www.openstreetmap.org/copyright
          - text: contributors
      - generic:
        - button "Center map to my location" [ref=e30] [cursor=pointer]: 📍
        - button "Install Fuel Finder App" [ref=e31] [cursor=pointer]:
          - img [ref=e32]
          - generic [ref=e35]: Install App
  - contentinfo [ref=e36]:
    - link "About" [ref=e37] [cursor=pointer]:
      - /url: /about
```