// src/components/CustomerNotifications.jsx
import { useEffect, useState, useRef } from "react";
import { supabase } from "../services/supabase";

export default function CustomerNotifications({ customerPseudonym }) {
    const [notifications, setNotifications] = useState([]);
    const spokenRef = useRef(new Set()); // Track spoken notification IDs

    useEffect(() => {
        if (!customerPseudonym) return;

        // Initial fetch - show last 5
        supabase
            .from("customer_notifications")
            .select("*")
            .eq("customer_pseudonym", customerPseudonym)
            .order("created_at", { ascending: false })
            .limit(5)
            .then(({ data }) => {
                if (data) setNotifications(data.reverse());
            });

        // Realtime subscription
        const subscription = supabase
            .channel("public:customer_notifications")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "customer_notifications", filter: `customer_pseudonym=eq.${customerPseudonym}` },
                (payload) => {
                    const newNotif = payload.new;
                    setNotifications((prev) => [...prev, newNotif]);

                    // Dispatch event for other components
                    window.dispatchEvent(new CustomEvent("claimStatusUpdated", { detail: newNotif }));

                    // Speak message if not already spoken
                    if (!spokenRef.current.has(newNotif.id)) {
                        spokenRef.current.add(newNotif.id);
                        try {
                            if ("speechSynthesis" in window) {
                                const utter = new SpeechSynthesisUtterance(newNotif.message);
                                speechSynthesis.speak(utter);
                            }
                        } catch (e) {
                            console.warn("TTS failed", e);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [customerPseudonym]);

    if (notifications.length === 0) return null;

    return (
        <div aria-live="polite" className="fade-in" style={{
            position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000,
            display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '350px'
        }}>
            {notifications.slice(-3).map((n) => (
                <div key={n.id} style={{
                    backgroundColor: 'hsl(var(--color-surface))',
                    border: '1px solid hsl(var(--color-primary))',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    boxShadow: 'var(--shadow-lg)',
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'hsl(var(--color-primary))' }}>
                            {n.status}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'hsl(var(--color-text-muted))' }}>
                            {new Date(n.created_at).toLocaleTimeString()}
                        </span>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'hsl(var(--color-text))' }}>{n.message}</div>
                </div>
            ))}
        </div>
    );
}
