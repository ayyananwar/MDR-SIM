import unittest
import numpy as np
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from metrics import decode,sessions,event_metrics,frame_metrics,hmm_filter

class ResearchTests(unittest.TestCase):
    def test_duration_and_gap(self):
        self.assertEqual(sessions(np.ones((30,1),bool),[['a','b']]),[])
        self.assertEqual(sessions(np.ones((31,1),bool),[['a','b']])[0]['detectedAt'],30)
        bits=np.ones((61,1),bool);bits[30]=False
        self.assertEqual(sessions(bits,[['a','b']]),[])
    def test_event_counts_and_time(self):
        truth=[{'pair':'a|b','start':0,'end':40}]
        pred=[{'pair':'a|b','start':5,'end':35,'detectedAt':35},
              {'pair':'a|c','start':0,'end':30,'detectedAt':30}]
        m=event_metrics(pred,truth,50,[['a','b'],['a','c']])
        self.assertEqual((m['tp'],m['fp'],m['fn']),(1,1,0))
        self.assertEqual(m['falsePositivePairSeconds'],31)
        self.assertEqual(m['falseNegativePairSeconds'],10)
        self.assertEqual(m['durationMAE'],10)
    def test_empty_reference_does_not_hide_false_alarms(self):
        self.assertIsNone(event_metrics([],[],40,[['a','b']])['f1'])
        self.assertEqual(event_metrics([{'pair':'a|b','start':0,'end':30,'detectedAt':30}],[],40,[['a','b']])['f1'],0)
    def test_decoder_is_causal_and_abstains(self):
        p=np.ones((60,1))*.8;eligible=np.ones_like(p,bool)
        np.testing.assert_array_equal(decode(p,eligible,.5,'occupancy')[:20],decode(p[:20],eligible[:20],.5,'occupancy'))
        eligible[20]=False;self.assertFalse(decode(p,eligible,.5,'occupancy')[20,0])
        self.assertFalse(decode(p,eligible,.5,'occupancy')[8,0]);self.assertTrue(decode(p,eligible,.5,'occupancy')[9,0])
    def test_markov_is_causal(self):
        p=np.tile([.2,.8],(30,1));e=np.ones_like(p,bool);trans={'prior':.2,'p01':.01,'p11':.98}
        full=hmm_filter(p,e,trans,.2);short=hmm_filter(p[:10],e[:10],trans,.2)
        np.testing.assert_allclose(full[:10],short)
        self.assertTrue(np.all((full>=0)&(full<=1)))
    def test_training_scaler_does_not_access_heldout(self):
        x=np.array([[0.,0.],[1.,1.],[2.,0.],[3.,1.]]);y=np.array([0,0,1,1])
        pipeline=make_pipeline(StandardScaler(),LogisticRegression()).fit(x,y)
        before=pipeline[0].mean_.copy();pipeline.predict_proba(np.array([[10000.,10000.]]))
        np.testing.assert_array_equal(before,pipeline[0].mean_)
    def test_calibration_arithmetic(self):
        m=frame_metrics(np.array([.1,.9]),np.array([0,1]))
        self.assertAlmostEqual(m['frameBrier'],.01);self.assertAlmostEqual(m['frameECE'],.1)
        self.assertEqual(m['frameAUROC'],1)

if __name__=='__main__':unittest.main()
