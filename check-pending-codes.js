const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = 'https://klpkxpzvwwdpnalegpre.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
  console.log('Please set it in your .env file or environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPendingCodes() {
  try {
    // Get total count
    const { count: totalCount, error: totalError } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true });

    if (totalError) throw totalError;

    // Get codes sent count
    const { count: sentCount, error: sentError } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true })
      .eq('code_sent', true);

    if (sentError) throw sentError;

    const pendingCount = (totalCount || 0) - (sentCount || 0);
    const limit = 100; // Default limit

    console.log('\n📊 Waitlist Code Distribution Status');
    console.log('=====================================');
    console.log(`Total waitlist entries:    ${totalCount || 0}`);
    console.log(`Codes already sent:        ${sentCount || 0}`);
    console.log(`Codes still pending:       ${pendingCount}`);
    console.log(`Maximum codes to send:     ${limit}`);
    console.log(`Remaining capacity:        ${Math.max(0, limit - (sentCount || 0))}`);
    console.log('=====================================\n');

    if (pendingCount > 0) {
      console.log(`✅ You have ${pendingCount} codes still to send out!\n`);
    } else {
      console.log('✅ All available codes have been sent!\n');
    }

  } catch (error) {
    console.error('Error querying database:', error.message);
    process.exit(1);
  }
}

checkPendingCodes();
