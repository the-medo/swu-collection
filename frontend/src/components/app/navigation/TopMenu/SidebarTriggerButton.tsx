import { SidebarTrigger } from '@/components/ui/sidebar.tsx';

function SidebarTriggerButton() {
  return <SidebarTrigger className="md:hidden fixed top-0 left-0 z-20 h-10 w-10 [&_svg]:size-6" />;
}
export default SidebarTriggerButton;
