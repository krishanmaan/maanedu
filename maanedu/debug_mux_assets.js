// Debug script to check Mux assets and update database
// Run this in your browser console on the admin page

async function debugMuxAssets() {
  console.log('🔍 Checking Mux assets in database...');
  
  try {
    // Get all Mux videos from database
    const response = await fetch('/api/debug/mux-assets');
    const data = await response.json();
    
    if (data.success) {
      console.log(`Found ${data.assets.length} Mux videos in database:`);
      
      for (const asset of data.assets) {
        console.log(`\n📹 Class: ${asset.title}`);
        console.log(`   Asset ID: ${asset.mux_asset_id || 'N/A'}`);
        console.log(`   Playback ID: ${asset.mux_playback_id || 'N/A'}`);
        console.log(`   Video URL: ${asset.video_url}`);
        
        // Check asset status on Mux
        if (asset.mux_asset_id) {
          try {
            const assetResponse = await fetch(`/api/mux/asset/${asset.mux_asset_id}`);
            const assetData = await assetResponse.json();
            
            if (assetData.success) {
              console.log(`   Mux Status: ${assetData.asset.status}`);
              console.log(`   Playback IDs: ${assetData.asset.playback_ids?.length || 0}`);
              
              // If asset is ready but no playback ID in database, suggest fix
              if (assetData.asset.status === 'ready' && 
                  assetData.asset.playback_ids?.length > 0 && 
                  !asset.mux_playback_id) {
                const playbackId = assetData.asset.playback_ids[0].id;
                console.log(`   ✅ READY! Suggested fix: Update playback_id to '${playbackId}'`);
              }
            } else {
              console.log(`   ❌ Error checking asset: ${assetData.error}`);
            }
          } catch (error) {
            console.log(`   ❌ Failed to check asset: ${error.message}`);
          }
        }
      }
    } else {
      console.error('Failed to fetch assets:', data.error);
    }
  } catch (error) {
    console.error('Debug failed:', error);
  }
}

// Run the debug
debugMuxAssets();
