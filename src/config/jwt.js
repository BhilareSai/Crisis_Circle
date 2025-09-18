const jwt = require("jsonwebtoken");

const jwtConfig = {
  accessTokenExpiry: "15m",
  refreshTokenExpiry: "7d",

  generateTokens: (user) => {
    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
      expiresIn: jwtConfig.accessTokenExpiry,
    });

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: jwtConfig.refreshTokenExpiry }
    );

    return { accessToken, refreshToken };
  },

  verifyAccessToken: (token) => {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  },

  verifyRefreshToken: (token) => {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  },

  decodeToken: (token) => {
    return jwt.decode(token);
  },
};

module.exports = jwtConfig;
