import { SidebarTrigger } from '@/components/ui/sidebar.tsx';

function SidebarTriggerButton() {
  return (
    <SidebarTrigger className="md:hidden fixed bottom-2 left-2 z-20 h-10 w-10 [&_svg]:size-6" />
  );
}
export default SidebarTriggerButton;
