Job matches
- collapsible job cards in the scan results
- pagination in the scan results
- fix the scores. everything is 100% or 0% (bangalore). Maybe user can put custom weights or "dealbreaker" on the categories (e.g. location *must* match)
- aggregate results options: location, company, 
- what is the 'new' tag? Based on job posting time?
- intelligent re-scanning. Maybe avoid certain slugs unless X time has passed?
- test linkedin
- test google jobs
- if google and linkedin aren't connected, indicate in the scan log
- stop specific scan stage but still keep results found.
BUG FIX:
- scan source drop down should keep the same check mark selections after navigating and returning to page
- BUG: click on pagination links sometimes mess with the scrolling. it also seems like sometimes they add more elements to the page
- Add # results to view option
- clear/ archive/ delete jobs

Profile
- Target companies should allow a long list
- should have an Add Bulk button that opens up a modal or new page. that will have a long list of defaults

Extension - browser plugin
- Auto-complete fields based on mappings with user profile in the main app
- POST back to main app when submitting. Allows user to track which have been applied to
- store the fields that are company specific, make them override global settings.
- can upload resume
  - can choose best resume based on role!?
- extension, if detects updates, will prompt to save before hitting submit
- extension has check box for whether to auto-upload resume since that might take more resources.

Misc
- README

Infra / platform
- ngrok
- nginx 