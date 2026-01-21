'use client';
import LibraryPage from '@/app/library/page';
import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase';
import styles from './admin.module.css';

export default function AdminLibrary() {
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        // 간단한 관리자 체크 (실제로는 더 강력한 인증 권장)
        // 여기서는 로컬 개발 편의를 위해 일단 모두 허용하거나, 특정 이메일 체크
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // 예: admin@ynk.com 만 허용하려면:
                // if (user.email === 'admin@ynk.com') setIsAuthorized(true);
                setIsAuthorized(true); // 일단 로그인만 되어있으면 허용 (테스트용)
            }
            setChecking(false);
        };
        checkUser();
    }, []);

    if (checking) return <div className="p-8 text-center">Checking permissions...</div>;

    if (!isAuthorized) {
        return (
            <div className="p-8 text-center text-red-600">
                <h2 className="text-xl font-bold mb-2">Access Denied</h2>
                <p>관리자 권한이 필요합니다. 로그인 해주세요.</p>
            </div>
        );
    }

    return (
        <section className={styles.container}>
            <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h2 className="font-bold text-yellow-800 mb-1">⚠️ 관리자 모드</h2>
                <p className="text-sm text-yellow-700">파일을 삭제하거나 이름을 변경하면 사용자들에게 즉시 반영됩니다. 주의하세요.</p>
            </div>
            <LibraryPage />
        </section>
    );
}
