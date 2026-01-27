'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import styles from './LibraryModal.module.css';

export default function LibraryModal({ onClose }) {
    const [view, setView] = useState('list'); // 'list' | 'detail'
    const [posts, setPosts] = useState([]);
    const [selectedPost, setSelectedPost] = useState(null);
    const [loading, setLoading] = useState(true);

    // DB 로드 (게시글 형태)
    useEffect(() => {
        async function loadPosts() {
            setLoading(true);
            try {
                // 1) library_posts 테이블 조회 시도
                const { data, error } = await supabase
                    .from('library_posts')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (!error && data && data.length > 0) {
                    setPosts(data);
                } else {
                    // 테이블이 없거나 데이터가 없는 경우 fallback (기존 library_files 테이블 조회)
                    const { data: fileData, error: fileErr } = await supabase
                        .from('library_files')
                        .select('*')
                        .order('uploaded_at', { ascending: false });

                    if (fileData && fileData.length > 0) {
                        const mapped = fileData.map(f => ({
                            id: f.id,
                            title: f.original_name || 'Legacy File',
                            content: 'Historical document stored as file.',
                            file_name: f.original_name,
                            file_url: f.file_name ? supabase.storage.from('library').getPublicUrl(f.file_name).data.publicUrl : null,
                            file_size: f.size_bytes,
                            created_at: f.uploaded_at
                        }));
                        setPosts(mapped);
                    } else if (data) {
                        setPosts(data); // 데이터가 정말 0개인 경우
                    }
                }
            } catch (err) {
                console.error("Library Load Error:", err);
            } finally {
                setLoading(false);
            }
        }
        loadPosts();
    }, []);

    const handlePostClick = (post) => {
        setSelectedPost(post);
        setView('detail');
    };

    const handleBack = () => {
        setSelectedPost(null);
        setView('list');
    };

    // 상세 뷰에서의 파일 다운로드 URL
    // library_posts 테이블에 file_url 이 있으면 그걸 쓰고,
    // 없는데 file_name만 있다면(구조에 따라) getPublicUrl로 생성
    const getDownloadUrl = (post) => {
        if (post.file_url) return post.file_url;
        // fallback logic if needed
        return '#';
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className={styles.header}>
                    <h2 className={styles.title}>
                        {view === 'list' ? 'File Library' : 'Details'}
                    </h2>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className={styles.content}>

                    {loading ? (
                        <div className={styles.loading}>Loading library data...</div>
                    ) : (
                        <>
                            {/* LIST VIEW */}
                            {view === 'list' && (
                                <div className={styles.listContainer}>
                                    {posts.length === 0 ? (
                                        <div className={styles.emptyState}>
                                            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📂</div>
                                            No posts found.
                                        </div>
                                    ) : (
                                        posts.map(post => (
                                            <div key={post.id} className={styles.postItem} onClick={() => handlePostClick(post)}>
                                                <div>
                                                    <div className={styles.postTitle}>{post.title}</div>
                                                    <div className={styles.postMeta}>
                                                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                                                        {post.file_name && (
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                • <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                                                File attached
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ color: '#cbd5e1' }}>
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* DETAIL VIEW */}
                            {view === 'detail' && selectedPost && (
                                <div className={styles.detailContainer}>
                                    <button className={styles.backBtn} onClick={handleBack}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                                        Back to list
                                    </button>

                                    <div>
                                        <h3 className={styles.detailTitle}>{selectedPost.title}</h3>
                                        <div className={styles.detailDate}>
                                            Posted on {new Date(selectedPost.created_at).toLocaleString()}
                                        </div>
                                    </div>

                                    <div className={styles.detailBody}>
                                        {selectedPost.content || "No content."}
                                    </div>

                                    {/* File Attachment Card */}
                                    {(selectedPost.file_name || selectedPost.file_url) && (
                                        <a
                                            href={getDownloadUrl(selectedPost)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.fileCard}
                                            download
                                        >
                                            <div className={styles.fileIcon}>
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div className={styles.fileName}>{selectedPost.file_name || "Attachment"}</div>
                                                {selectedPost.file_size && (
                                                    <div className={styles.fileSize}>{(selectedPost.file_size / 1024 / 1024).toFixed(2)} MB</div>
                                                )}
                                            </div>
                                            <div>Download</div>
                                        </a>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
