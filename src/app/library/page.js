'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import styles from './library.module.css';

export default function LibraryPage() {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    // ---------- 파일 리스트 로드 ----------
    const loadFiles = async () => {
        // 1) DB에서 메타데이터 조회
        const { data: dbData, error: dbErr } = await supabase
            .from('library_files')
            .select('*')
            .order('uploaded_at', { ascending: false });

        // DB 테이블이 아직 없거나 에러가 나면, 스토리지에서 직접 리스트를 가져와서 보여주는 폴백(fallback)을 권장하지만,
        // 여기서는 일단 DB 테이블이 생성되었다고 가정하고 구현합니다.
        // 만약 테이블이 없다면 Supabase Console에서 SQL을 실행해야 합니다.
        if (dbErr) {
            console.warn('DB Load Error (테이블이 없을 수 있음):', dbErr.message);
            // Fallback: 스토리지 직접 조회
            await loadFilesFromStorage();
            return;
        }
        setFiles(dbData || []);
    };

    const loadFilesFromStorage = async () => {
        const { data, error } = await supabase.storage.from('library').list('', {
            limit: 100,
            offset: 0,
            sortBy: { column: 'created_at', order: 'desc' }
        });
        if (error) {
            setError(error.message);
            return;
        }
        // DB 형식이 아니므로 변환해서 state에 저장
        const mapped = data.map(f => ({
            id: f.id,
            file_name: f.name,
            original_name: f.name,
            size_bytes: f.metadata?.size || 0,
            uploaded_at: f.created_at
        }));
        setFiles(mapped);
    }

    useEffect(() => { loadFiles(); }, []);

    // ---------- 파일 업로드 ----------
    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024 * 1024) {
            setError('파일이 너무 큽니다. 최대 5GB까지 업로드 가능합니다.');
            return;
        }

        setUploading(true);
        const storagePath = `${Date.now()}_${file.name}`;

        // 1️⃣ Storage에 파일 업로드
        const { error: uploadErr } = await supabase.storage
            .from('library')
            .upload(storagePath, file);

        if (uploadErr) {
            setError('Upload Failed: ' + uploadErr.message);
            setUploading(false);
            return;
        }

        // 2️⃣ DB에 메타데이터 삽입
        // (테이블이 없으면 이 부분에서 에러가 나겠지만, 파일은 스토리지는 올라감)
        const user = await supabase.auth.getUser();
        const userId = user.data.user?.id;

        const { error: dbErr } = await supabase
            .from('library_files')
            .insert({
                file_name: storagePath,
                original_name: file.name,
                size_bytes: file.size,
                mime_type: file.type,
                uploaded_by: userId,
            });

        if (dbErr) {
            console.error('DB Insert Error:', dbErr);
            // DB 저장이 실패해도 스토리지는 성공했으므로 리스트를 다시 로드해봄 (폴백 로직 지원)
        }

        await loadFiles();
        setUploading(false);
        // 입력 필드 초기화
        e.target.value = '';
    };

    // ---------- 파일 다운로드 ----------
    const getPublicUrl = (path) =>
        supabase.storage.from('library').getPublicUrl(path).data.publicUrl;

    // ---------- 파일 삭제 (관리자용 로직 포함) ----------
    const handleDelete = async (id, storagePath) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;

        // 1️⃣ Storage 파일 삭제
        const { error: delStorage } = await supabase.storage
            .from('library')
            .remove([storagePath]);

        if (delStorage) {
            setError(delStorage.message);
            return;
        }

        // 2️⃣ DB 레코드 삭제
        // (DB 연동 모드일 때만)
        if (id) {
            const { error: delDb } = await supabase
                .from('library_files')
                .delete()
                .eq('id', id);
            if (delDb) {
                console.error(delDb); // DB가 없을 수도 있으니 로그만
            }
        }

        await loadFiles();
    };

    // ---------- 파일 이름 수정 (관리자용) ----------
    const handleRename = async (id, currentName) => {
        const newName = prompt('새 파일명을 입력하세요', currentName);
        if (!newName) return;

        const { error } = await supabase
            .from('library_files')
            .update({ original_name: newName })
            .eq('id', id);

        if (error) setError(error.message);
        else await loadFiles();
    };

    return (
        <main className={styles.container}>
            <h1 className="text-2xl font-bold mb-6">자료실 (File Library)</h1>

            {/* 업로드 영역 */}
            <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
                <label className="block mb-2 font-semibold text-gray-700">새 파일 업로드</label>
                <input
                    type="file"
                    onChange={handleUpload}
                    disabled={uploading}
                    className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-emerald-50 file:text-emerald-700
            hover:file:bg-emerald-100
          "
                />
                {uploading && <p className="text-sm text-blue-600 mt-2 font-medium">업로드 중입니다... 잠시만 기다려주세요.</p>}
            </div>

            {/* 오류 메시지 */}
            {error && <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-lg">{error}</div>}

            {/* 파일 리스트 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <ul className="divide-y divide-gray-100">
                    {files.map((f) => (
                        <li key={f.id || f.file_name} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900 truncate max-w-xs sm:max-w-md">{f.original_name}</div>
                                    <div className="text-xs text-gray-500">
                                        {(f.size_bytes / (1024 * 1024)).toFixed(2)} MB · {new Date(f.uploaded_at).toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* 다운로드 */}
                                <a
                                    href={getPublicUrl(f.file_name)}
                                    download={f.original_name} // 힌트 제공
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                                >
                                    다운로드
                                </a>

                                {/* 수정/삭제 (누구나 볼수있지만 실제 권한은 RLS로 제어됨, 여기선 UI 그냥 노출) */}
                                <div className="flex gap-1 ml-2 pl-2 border-l border-gray-200">
                                    {f.id && ( /* DB ID가 있을때만 수정 가능 */
                                        <button
                                            onClick={() => handleRename(f.id, f.original_name)}
                                            className="p-1.5 text-gray-400 hover:text-indigo-600 rounded hover:bg-indigo-50"
                                            title="이름 수정"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(f.id, f.file_name)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                                        title="삭제"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}

                    {files.length === 0 && (
                        <li className="p-8 text-center text-gray-400">
                            아직 업로드된 파일이 없습니다.
                        </li>
                    )}
                </ul>
            </div>
        </main>
    );
}
