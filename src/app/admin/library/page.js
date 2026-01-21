'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import styles from './admin.module.css';

export default function AdminLibrary() {
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [checking, setChecking] = useState(true);

    // 게시글 관리 State
    const [posts, setPosts] = useState([]);
    const [form, setForm] = useState({ title: '', content: '' });
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [error, setError] = useState('');

    // 1) 권한 체크
    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setIsAuthorized(true);
            }
            setChecking(false);
            loadPosts();
        };
        checkUser();
    }, []);

    // 2) 게시글 목록 로드
    const loadPosts = async () => {
        // library_posts 조회 시도
        const { data, error } = await supabase
            .from('library_posts')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) setPosts(data);
        else if (error) {
            // fallback: if table not exists, maybe show empty or old file list?
            // For admin, let's just show error if it fails
            console.error("Load Error:", error);
        }
    };

    // 3) 게시글 작성/수정
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title) return alert('제목을 입력하세요');

        setUploading(true);
        setError('');

        try {
            let fileUrl = null;
            let fileName = null;
            let fileSize = null;

            // 파일 업로드 (새 파일이 있는 경우)
            if (file) {
                const storagePath = `${Date.now()}_${file.name}`;
                const { error: upErr } = await supabase.storage
                    .from('library')
                    .upload(storagePath, file);

                if (upErr) throw upErr;

                fileUrl = supabase.storage.from('library').getPublicUrl(storagePath).data.publicUrl;
                fileName = file.name;
                fileSize = file.size;
            }

            const payload = {
                title: form.title,
                content: form.content,
            };
            // 파일 정보가 있으면 업데이트
            if (fileUrl) {
                payload.file_url = fileUrl;
                payload.file_name = fileName;
                payload.file_size = fileSize;
            }

            if (editingId) {
                // Update
                const { error: upErr } = await supabase
                    .from('library_posts')
                    .update(payload)
                    .eq('id', editingId);
                if (upErr) throw upErr;
            } else {
                // Insert
                const { error: inErr } = await supabase
                    .from('library_posts')
                    .insert(payload);
                if (inErr) throw inErr;
            }

            // 초기화
            setForm({ title: '', content: '' });
            setFile(null);
            setEditingId(null);
            await loadPosts();

        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    // 4) 삭제
    const handleDelete = async (id, fileUrl) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;

        // 파일 삭제 로직은 fileUrl에서 경로 파싱이 필요하지만, 여기선 DB만 일단 삭제해도 무방.
        // 필요시 storage.remove 추가
        const { error } = await supabase.from('library_posts').delete().eq('id', id);
        if (error) alert(error.message);
        else await loadPosts();
    };

    const startEdit = (post) => {
        setEditingId(post.id);
        setForm({ title: post.title, content: post.content || '' });
        setFile(null); // 파일은 새로 올릴때만
    };

    const cancelEdit = () => {
        setEditingId(null);
        setForm({ title: '', content: '' });
        setFile(null);
    }

    if (checking) return <div className="p-8 text-center">Checking...</div>;
    if (!isAuthorized) return <div className="p-8 text-red-600">관리자 권한이 없습니다.</div>;

    return (
        <div className={styles.container}>
            <h1 className="text-2xl font-bold mb-6">자료실 게시판 관리</h1>

            {/* 입력 폼 */}
            <form onSubmit={handleSubmit} className="mb-8 p-6 bg-white border rounded-xl shadow-sm">
                <h2 className="text-lg font-semibold mb-4">{editingId ? '게시글 수정' : '새 게시글 작성'}</h2>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">제목</label>
                    <input
                        type="text"
                        className="w-full border rounded-lg p-2"
                        value={form.title}
                        onChange={e => setForm({ ...form, title: e.target.value })}
                        placeholder="제목을 입력하세요"
                    />
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">내용</label>
                    <textarea
                        className="w-full border rounded-lg p-2 h-32"
                        value={form.content}
                        onChange={e => setForm({ ...form, content: e.target.value })}
                        placeholder="내용을 입력하세요"
                    ></textarea>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">첨부파일 {editingId && '(변경 시에만 선택)'}</label>
                    <input
                        type="file"
                        onChange={e => setFile(e.target.files?.[0] || null)}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                </div>

                {error && <div className="text-red-600 mb-4 text-sm">{error}</div>}

                <div className="flex gap-2">
                    <button
                        type="submit"
                        disabled={uploading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {uploading ? '저장 중...' : (editingId ? '수정 완료' : '작성 완료')}
                    </button>
                    {editingId && (
                        <button type="button" onClick={cancelEdit} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg">취소</button>
                    )}
                </div>
            </form>

            {/* 목록 */}
            <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700">
                        <tr>
                            <th className="p-4 font-semibold">제목</th>
                            <th className="p-4 font-semibold">첨부파일</th>
                            <th className="p-4 font-semibold">작성일</th>
                            <th className="p-4 font-semibold text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {posts.map(post => (
                            <tr key={post.id} className="hover:bg-gray-50">
                                <td className="p-4 font-medium">{post.title}</td>
                                <td className="p-4 text-gray-500">
                                    {post.file_name ? (
                                        <a href={post.file_url} target="_blank" className="text-blue-600 hover:underline flex items-center gap-1">
                                            🗂 {post.file_name}
                                        </a>
                                    ) : '-'}
                                </td>
                                <td className="p-4 text-gray-500">{new Date(post.created_at).toLocaleDateString()}</td>
                                <td className="p-4 text-right">
                                    <button onClick={() => startEdit(post)} className="text-blue-600 hover:underline mr-3">수정</button>
                                    <button onClick={() => handleDelete(post.id, post.file_url)} className="text-red-600 hover:underline">삭제</button>
                                </td>
                            </tr>
                        ))}
                        {posts.length === 0 && (
                            <tr><td colSpan={4} className="p-8 text-center text-gray-400">게시글이 없습니다.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
