<script lang="ts">
    import { afterNavigate } from '$app/navigation';
    import { navigationHistory } from '$lib/navigation';

    afterNavigate(({ to }) => {
        if (to?.url) {
            navigationHistory.push(to.url.pathname + to.url.search);
        }
    });
</script>

<slot />
