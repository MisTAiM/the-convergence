const https = require('https');

const UID = '348354392178688010';

function get(url) {
  return new Promise(resolve => {
    https.get(url, { headers: { 'User-Agent': 'TheConvergence/3.0' } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(null); } });
    }).on('error', () => resolve(null)).setTimeout(9000, function() { this.destroy(); resolve(null); });
  });
}

module.exports = async (req, res) => {
  const [japi, lanyard] = await Promise.all([
    get(`https://japi.rest/discord/v1/user/${UID}`),
    get(`https://api.lanyard.rest/v1/users/${UID}`),
  ]);

  const profile = japi?.data || {};
  const live    = lanyard?.success ? lanyard.data : null;
  const du      = live?.discord_user || {};

  const avatar  = du.avatar  || profile.avatar  || '';
  const banner  = profile.banner || '';
  const decoAsset = (du.avatar_decoration_data || profile.avatar_decoration_data || {}).asset || '';

  const cdnAvatar = avatar
    ? `https://cdn.discordapp.com/avatars/${UID}/${avatar}.${avatar.startsWith('a_') ? 'gif' : 'png'}?size=512`
    : `https://cdn.discordapp.com/embed/avatars/5.png`;
  const cdnBanner = banner
    ? `https://cdn.discordapp.com/banners/${UID}/${banner}.${banner.startsWith('a_') ? 'gif' : 'png'}?size=600`
    : null;
  const cdnDeco = decoAsset
    ? `https://cdn.discordapp.com/avatar-decoration-presets/${decoAsset}.png`
    : null;

  const out = {
    id: UID,
    username:    du.username    || profile.tag       || 'morpheus7239',
    globalName:  du.global_name || profile.global_name || 'Morpheus',
    avatarHash:  avatar,
    avatarUrl:   cdnAvatar,
    bannerHash:  banner,
    bannerUrl:   cdnBanner,
    bannerColor: profile.banner_color || '#00fff8',
    decoUrl:     cdnDeco,
    flags:       profile.public_flags      || 0,
    flagsArray:  profile.public_flags_array || [],
    createdAt:   profile.createdAt         || null,
    nameplate:   profile.collectibles?.nameplate || null,
    profileUrl:  `https://discord.com/users/${UID}`,
    // live presence (null if not on Lanyard yet)
    status:      live?.discord_status || 'offline',
    onMobile:    live?.active_on_discord_mobile  || false,
    onDesktop:   live?.active_on_discord_desktop || false,
    activities:  live?.activities || [],
    spotify:     live?.listening_to_spotify ? live.spotify : null,
    lanyardLive: !!live,
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30');
  res.end(JSON.stringify(out));
};
