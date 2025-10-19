const axios = require('axios');

// Test custom fuel type functionality
async function testCustomFuelType() {
  try {
    console.log('🧪 Testing custom fuel type "egg"...');

    // First, let's get a station ID to test with
    const stationsResponse = await axios.get('http://localhost:3001/api/stations');
    const stations = stationsResponse.data;

    if (stations.length === 0) {
      console.log('❌ No stations found to test with');
      return;
    }

    const testStation = stations[0];
    console.log(`📍 Using station: ${testStation.name} (ID: ${testStation.id})`);

    // Try to add a custom fuel type "egg"
    const fuelType = 'egg';
    const price = 100.50;

    console.log(`⛽ Attempting to add fuel type "${fuelType}" with price ₱${price}`);

    const response = await axios.put(
      `http://localhost:3001/api/stations/${testStation.id}/fuel-prices/${fuelType}`,
      {
        price: price,
        updated_by: 'test'
      },
      {
        headers: {
          'x-api-key': 'sirjeildeanedgar'
        }
      }
    );

    console.log('✅ Success! Response:', response.data);

    // Verify the fuel type was added by fetching station fuel prices
    const fuelPricesResponse = await axios.get(`http://localhost:3001/api/stations/${testStation.id}/fuel-prices`);
    console.log('📋 Station fuel prices:', fuelPricesResponse.data.fuel_prices);

    // Check if our custom fuel type exists
    const customFuelType = fuelPricesResponse.data.fuel_prices.find(fp => fp.fuel_type === fuelType);
    if (customFuelType) {
      console.log(`🎉 Custom fuel type "${fuelType}" successfully added!`);
      console.log(`   Price: ₱${customFuelType.price}`);
      console.log(`   Updated at: ${customFuelType.price_updated_at}`);
    } else {
      console.log(`❌ Custom fuel type "${fuelType}" not found in station fuel prices`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testCustomFuelType();
