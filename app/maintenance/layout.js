// Bu layout kök layout'u (navbar/footer) ATLAR — bakım sayfası tamamen bağımsız
export const metadata = { title: 'Bakım Modu', robots: { index: false } };
export default function MaintenanceLayout({ children }) {
    return children;
}