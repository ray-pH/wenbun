<script lang="ts">
	import { base } from '$app/paths';
	import TopBar from '$lib/components/TopBar.svelte';
</script>

<TopBar title="Wenbun Privacy Policy"></TopBar>
<div class="container">
	<div class="text-container">
		<p>Last updated: August 17, 2025</p>

		<p>I respect your privacy. Wenbun is open source and hosted on GitHub Pages.</p>

		<h2>Information Collection and Use</h2>
		<p>
			Wenbun offers optional Google Sign-In. If you choose to log in, your
			email address is stored to provide this functionality. You can still use the service without
			logging in. This data is not used for any other purpose or shared with third parties.
		</p>

		<h2>Third-Party Services</h2>
		<p>
			This site is hosted on GitHub Pages, which may collect visitor logs. Please see the
			<a href="https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement"
				>GitHub Privacy Statement</a
			> for more details.
		</p>

		<h2>Server</h2>
		<p>
			The Google Sign-In functionality is handled by a server hosted on Railway. Please see the
			<a href="https://railway.app/legal/privacy">Railway Privacy Policy</a> for more details.
		</p>

		<h2>Contact Me</h2>
		<p>
			If you have any questions about this Privacy Policy, you can find the source code and my
			contact information on
			<a href="https://github.com/ray-pH/wenbun">GitHub</a>. The server code is hosted at <a href="https://github.com/ray-pH/wenbun-server">wenbun-server</a>.
		</p>
	</div>
</div>

<style>
	.container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		margin: 1em;
		padding-top: 1em;
	}
	.text-container {
		max-width: 32em;
	}
	a {
		color: var(--wenbun-blue);
	}
</style>
