module.exports = {
  generateCoordinates,
};

function generateCoordinates(userContext, events, done) {
  // Bounding box for Metro Manila (approximate)
  const minLat = 14.40;
  const maxLat = 14.75;
  const minLng = 120.90;
  const maxLng = 121.15;

  const startLat = (Math.random() * (maxLat - minLat) + minLat).toFixed(6);
  const startLng = (Math.random() * (maxLng - minLng) + minLng).toFixed(6);

  const endLat = (Math.random() * (maxLat - minLat) + minLat).toFixed(6);
  const endLng = (Math.random() * (maxLng - minLng) + minLng).toFixed(6);

  userContext.vars.startLat = startLat;
  userContext.vars.startLng = startLng;
  userContext.vars.endLat = endLat;
  userContext.vars.endLng = endLng;

  return done();
}
