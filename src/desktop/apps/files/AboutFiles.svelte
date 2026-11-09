<script lang="ts">
  import AboutDialog from '../adw/AboutDialog.svelte';
  import appIcon from './icons/org.gnome.Nautilus.png?url';

  // nautilus_window_show_about_dialog: the name, developer, website, issue link and licence come from the metainfo; the
  // version, copyright, credits and support link from Files itself. No Ubuntu patch changes them.
  let { onclose }: { onclose: () => void } = $props();
</script>

<AboutDialog
  name="Files"
  {appIcon}
  developer="The GNOME Project"
  version="50.2.2"
  website="https://apps.gnome.org/Nautilus/"
  supportUrl="https://discourse.gnome.org/tag/nautilus"
  issueUrl="https://gitlab.gnome.org/GNOME/nautilus/issues"
  credits={[
    { title: 'Code by', people: ['The GNOME Project'] },
    { title: 'Design by', people: ['The GNOME Project'] },
    { title: 'Documentation by', people: ['The GNOME Project', 'Sun Microsystems'] },
  ]}
  copyright="© 1999 The Files Authors"
  license={{ name: 'GNU General Public License, version 3 or later', url: 'https://www.gnu.org/licenses/gpl-3.0.html' }}
  {onclose}
/>
