// ضع هذه الاستيرادات الحديثة بدلاً منها في أعلى الملف
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. بيانات الاتصال الخاصة بمشروعك في Supabase
const SUPABASE_URL = 'https://nhahqcvkkfwnffbxptqi.supabase.co';
// تنبيه: استبدل النص أدناه بمفتاح الـ (service_role secret key) لضمان تخطي حماية RLS أثناء الرفع المكثف
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0bHl2anR6YnlkeXZwdHZuemVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjMxMzM0NiwiZXhwIjoyMDk3ODg5MzQ2fQ.fM78kC-5sX_f0Qj5f5wGv82TjQxRk4LdI6oD1qJt9h8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. إعدادات المجلد والـ Storage والألبوم
const FOLDER_PATH = path.join(__dirname, 'audio-files');
const BUCKET_NAME = 'audios'; // اسم الـ Bucket الخاص بالملفات الصوتية في السيرفر
const ALBUM_ID = 1;          // المعرف الافتراضي لألبوم العزاء أو الأدعية الحالي

async function uploadAllAudios() {
    try {
        // التأكد من وجود المجلد محلياً
        if (!fs.existsSync(FOLDER_PATH)) {
            console.error(`❌ خطأ: المجلد 'audio-files' غير موجود في هذا المسار: ${FOLDER_PATH}`);
            console.log("💡 رجاءً قم بإنشاء المجلد وضع ملفات الـ MP3 بداخله ثم أعد التشغيل.");
            return;
        }

        // قراءة جميع ملفات MP3 داخل المجلد
        const files = fs.readdirSync(FOLDER_PATH).filter(file => file.endsWith('.mp3'));

        if (files.length === 0) {
            console.log('⚠️ لم يتم العثور على أي ملفات بصيغة .mp3 داخل مجلد audio-files.');
            return;
        }

        console.log(`🚀 تم العثور على ${files.length} ملف صوتي. جاري بدء الرفع التلقائي للموقع الرسمي...`);

        for (let i = 0; i < files.length; i++) {
            const fileName = files[i];
            const filePath = path.join(FOLDER_PATH, fileName);
            const fileBuffer = fs.readFileSync(filePath);

            console.log(`\n[${i + 1}/${files.length}] جاري معالجة: ${fileName}...`);

            // أولاً: رفع الملف الصوتي إلى Supabase Storage
            const { data: storageData, error: storageError } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(`tracks/${fileName}`, fileBuffer, {
                    contentType: 'audio/mpeg',
                    upsert: true // تحديث الملف مباشرة إذا كان مرفوعاً مسبقاً
                });

            if (storageError) {
                console.error(`❌ خطأ أثناء رفع ملف ${fileName} إلى الـ Storage:`, storageError.message);
                continue;
            }

            // ثانياً: استخراج رابط الملف المباشر (Public URL)
            const { data: urlData } = supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(`tracks/${fileName}`);

            const audioUrl = urlData.publicUrl;

            // ثالثاً: تنظيف اسم الملف لجعله عنواناً مناسباً للقصيدة/الصوتية
            // تحويل الشرطات إلى مساحات وإزالة امتداد .mp3
            const trackTitle = fileName
                .replace('.mp3', '')
                .replace(/_/g, ' ')
                .replace(/-/g, ' ')
                .trim();

            // رابعاً: إدخال البيانات في جدول قاعدة البيانات (Audios)
            const { error: dbError } = await supabase
                .from('audios')
                .insert([
                    {
                        title: trackTitle,
                        audio_url: audioUrl,
                        album_id: ALBUM_ID,
                        duration: "00:00" // يمكنك تعديل المدة يدوياً لاحقاً من لوحة التحكم
                    }
                ]);

            if (dbError) {
                console.error(`❌ خطأ أثناء حفظ بيانات ${fileName} في قاعدة البيانات:`, dbError.message);
            } else {
                console.log(`✅ بنجاح: تم رفع الصوتية وتوثيقها باسم [ ${trackTitle} ]`);
            }
        }

        console.log('\n🎉 اكتملت العملية بنجاح! تم رفع وأرشفة كافة الملفات الصوتية في قاعدة البيانات.');

    } catch (error) {
        console.error('🔴 حدث خطأ غير متوقع أثناء تشغيل السكريبت:', error);
    }
}

uploadAllAudios();