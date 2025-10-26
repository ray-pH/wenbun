<script lang="ts">
    import { goto } from "$app/navigation";
    import { base } from "$app/paths";

    export let data: {token?: string};
    
    if (data.token) {
        localStorage.setItem('jwt', data.token);
        // redirect to settings page
        goto(base + '/settings')
    }
</script>