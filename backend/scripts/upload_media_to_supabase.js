const path = require('path');
const fs = require('fs');

const supabaseModulePath = path.resolve(__dirname, '..', '..', 'frontend', 'node_modules', '@supabase', 'supabase-js');
const { createClient } = require(supabaseModulePath);

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://poexygwbosuxbezeastc.supabase.co';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || '';
if (!SUPABASE_SECRET_KEY) {
  console.log('[WARN] SUPABASE_SECRET_KEY is not set. Exiting upload.');
  process.exit(0);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

const uploadsDir = path.resolve(__dirname, '..', 'uploads');

function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
}

async function uploadMedia() {
  console.log('🚀 Uploading local media files to Supabase "menu-media" bucket...');
  const files = fs.readdirSync(uploadsDir);
  let successCount = 0;
  let skipCount = 0;

  for (const f of files) {
    if (f.startsWith('.') || f.endsWith('.gitkeep')) {
      skipCount++;
      continue;
    }
    const filePath = path.join(uploadsDir, f);
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) continue;

    const fileBuffer = fs.readFileSync(filePath);
    const mime = getMimeType(f);

    const { data, error } = await supabase.storage
      .from('menu-media')
      .upload(f, fileBuffer, {
        contentType: mime,
        upsert: true
      });

    if (error) {
      console.error(`❌ Failed to upload ${f}:`, error.message);
    } else {
      successCount++;
    }
  }

  console.log(`\n🎉 Upload Complete!`);
  console.log(`- Uploaded to Cloud: ${successCount} files`);
  console.log(`- Public URL format: ${SUPABASE_URL}/storage/v1/object/public/menu-media/<filename>`);

  // Verify by listing
  const { data: list, error: lErr } = await supabase.storage.from('menu-media').list('', { limit: 100 });
  if (lErr) {
    console.error('List error:', lErr.message);
  } else {
    console.log(`✅ Total files verified in Supabase "menu-media" bucket: ${list.length}`);
  }
}

uploadMedia();
