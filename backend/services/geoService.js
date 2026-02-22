const axios = require('axios');

/**
 * Geolocate an IP address using the free ip-api.com service.
 * Free tier allows 45 req/min, no HTTPs for free, using http://ip-api.com/json.
 * 
 * Returns { country, countryCode, region, regionName, city, zip, isp, proxy, hosting }
 */
const geolocateIP = async (ip) => {
  // Handle localhost / private IPs in development gracefully
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return {
      country: 'United States',
      countryCode: 'US',
      region: 'NY',
      regionName: 'New York',
      city: 'Local Area',
      zip: '10001',
      isp: 'Local ISP',
      proxy: false,
      hosting: false
    };
  }

  try {
    // Fields param to get Proxy and Hosting (VPN/Datacenter) info
    const url = `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,isp,proxy,hosting`;
    const response = await axios.get(url, { timeout: 3000 });
    
    if (response.data.status === 'success') {
      return response.data;
    } else {
      console.warn(`GeoIP failed for ${ip}: ${response.data.message}`);
      return fallbackGeo();
    }
  } catch (error) {
    console.error(`GeoIP error for ${ip}:`, error.message);
    return fallbackGeo();
  }
};

const fallbackGeo = () => ({
  country: 'Unknown',
  countryCode: 'XX',
  region: 'Unknown',
  regionName: 'Unknown',
  city: 'Unknown',
  zip: '',
  isp: 'Unknown',
  proxy: false,
  hosting: false
});

module.exports = { geolocateIP };
